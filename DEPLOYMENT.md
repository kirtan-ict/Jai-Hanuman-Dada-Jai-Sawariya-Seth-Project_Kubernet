# Deploying the KubeSetu website

The site in `docs/` is plain HTML/CSS/JS with no build step. It ships three ways:

| Target | How | Where it's configured |
|---|---|---|
| Local preview | `python -m http.server` or `docker run` | none |
| Kubernetes | Container image + Kustomize overlays | `Dockerfile`, `deploy/nginx/`, `k8s/` |
| GitHub Pages | GitHub Actions | `.github/workflows/pages.yml` |

## 1. Run locally

### Python, quickest

```bash
cd docs
python -m http.server 8000
# open http://localhost:8000
```

This gives you no security headers, no gzip and no custom 404. Use Docker to see production behaviour.

### Docker, same as production

```bash
docker build -t kubesetu-site:local .
docker run --rm -p 8080:8080 --read-only \
  --tmpfs /tmp --tmpfs /var/cache/nginx --cap-drop ALL \
  kubesetu-site:local
# open http://localhost:8080        health check: http://localhost:8080/healthz
```

The image is based on `nginxinc/nginx-unprivileged` (pinned tag). It runs as UID 101, listens on **8080** and works with a read-only root filesystem. `deploy/nginx/default.conf` adds:

- gzip compression
- cache headers: HTML always revalidates, CSS/JS are cached for 7 days, images and fonts for 30 days
- security headers: CSP (allows Google Fonts plus inline scripts and styles), `X-Content-Type-Options`, `X-Frame-Options` plus `frame-ancestors`, `Referrer-Policy` and `Permissions-Policy`
- a custom `404.html`
- `GET /healthz` returning `200 ok`

## 2. Build and push the image

CI pushes the image to GHCR automatically on every push to `main` (see section 5). To push by hand:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u <github-user> --password-stdin   # PAT needs write:packages
docker build -t ghcr.io/kirtan-ict/kubesetu-site:sha-$(git rev-parse --short HEAD) .
docker push ghcr.io/kirtan-ict/kubesetu-site:sha-$(git rev-parse --short HEAD)
```

> GHCR packages are **private** when first created. If your cluster has no pull secret, open the package's settings on GitHub and make it public. Otherwise, create an `imagePullSecret` and add it to the Deployment.

## 3. Deploy to Kubernetes

### Prerequisites

- Kubernetes 1.27 or newer and `kubectl` 1.27 or newer (Kustomize is built in)
- **ingress-nginx** installed in the `ingress-nginx` namespace, with IngressClass `nginx`:
  ```bash
  helm upgrade --install ingress-nginx ingress-nginx \
    --repo https://kubernetes.github.io/ingress-nginx -n ingress-nginx --create-namespace
  ```
- **cert-manager** and a `ClusterIssuer` named `letsencrypt-prod` (and `letsencrypt-staging` for dev):
  ```bash
  helm upgrade --install cert-manager cert-manager \
    --repo https://charts.jetstack.io -n cert-manager --create-namespace --set crds.enabled=true
  ```
- **metrics-server**, which the HorizontalPodAutoscaler needs
- A CNI that enforces NetworkPolicy, such as Calico, Cilium or a cloud CNI with policy enabled
- A DNS record pointing your domain at the ingress controller's load balancer

### Layout

```
k8s/
├── base/                 # namespace, deployment, service, ingress, hpa, pdb, networkpolicy
└── overlays/
    ├── dev/              # ns jai-hanuman-dada-dev, 1 replica, :latest, staging issuer, dev host
    └── prod/             # ns jai-hanuman-dada, 3 replicas (HPA 3-10), pinned image tag
```

The base hardens the workload:

- non-root UID 101
- `readOnlyRootFilesystem`, with `emptyDir` volumes for `/tmp` and `/var/cache/nginx`
- all Linux capabilities dropped and privilege escalation disabled
- seccomp `RuntimeDefault`
- no service-account token mounted
- topology spread across zones and nodes
- liveness and readiness probes on `/healthz`
- a `preStop` delay so connections drain cleanly
- a PodDisruptionBudget (`minAvailable: 1`)
- default-deny NetworkPolicy, with ingress on 8080 allowed only from the `ingress-nginx` namespace

### Before the first deploy: replace the `EDIT` placeholders

| File | Placeholder |
|---|---|
| `k8s/base/ingress.yaml` | host `kubesetu.example.com` and ClusterIssuer `letsencrypt-prod` |
| `k8s/overlays/dev/kustomization.yaml` | `dev.kubesetu.example.com` and `letsencrypt-staging` |
| `k8s/overlays/prod/kustomization.yaml` | `newTag: sha-0000000`. Set this to a real tag that CI pushed |
| `k8s/base/networkpolicy.yaml` | the namespace that ingress-nginx runs in, if it isn't `ingress-nginx` |
| `docs/sitemap.xml`, `docs/robots.txt` | the base URL `https://kubesetu.example.com/` |

### Apply

```bash
# preview what will be applied
kubectl kustomize k8s/overlays/dev

# dev
kubectl apply -k k8s/overlays/dev
kubectl -n jai-hanuman-dada-dev rollout status deploy/kubesetu-site

# prod
kubectl apply -k k8s/overlays/prod
kubectl -n jai-hanuman-dada rollout status deploy/kubesetu-site
kubectl -n jai-hanuman-dada get ingress,hpa,pdb,pods
```

To release a new version, change `newTag` in `k8s/overlays/prod/kustomization.yaml` to the new `sha-xxxxxxx` tag, then apply again. You can do this with `kustomize edit set image` or let a GitOps tool such as Argo CD or Flux watch the overlay. To roll back, use `kubectl -n jai-hanuman-dada rollout undo deploy/kubesetu-site` or revert the tag.

To check the site without DNS: `kubectl -n jai-hanuman-dada port-forward svc/kubesetu-site 8080:80`.

## 4. GitHub Pages

`.github/workflows/pages.yml` publishes `docs/` to Pages on every push to `main` that changes `docs/`. You can also run it by hand from the Actions tab. It leaves out `_template.html`.

**One-time setup:** in the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. Until you do, the deploy job fails.

The site will be served at `https://kirtan-ict.github.io/Jai-Hanuman-Dada-Jai-Sawariya-Seth-Project_Kubernet/`. All links are relative, so the sub-path works. Pages can't set custom HTTP headers, so the CSP and other headers apply only to the container deployment.

## 5. CI pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`:

1. **links**: an inline Python check. Every local `href` or `src` in `docs/*.html` must point to a file that exists, including `*.html` page links and `assets/`.
2. **manifests**: renders each overlay with `kubectl kustomize`, then validates it with `kubeconform -strict -ignore-missing-schemas`.
3. **image**: builds the Docker image and smoke-tests it with a read-only rootfs and all capabilities dropped. The test checks:
   - `/healthz` and `/` respond
   - the CSP header is present
   - an unknown path returns 404
   - the container isn't running as root

   **On push to `main` only**, this job also logs in to GHCR with `GITHUB_TOKEN` (`packages: write`). It then pushes `ghcr.io/kirtan-ict/kubesetu-site:sha-<short-sha>` and `:latest`.

Actions are pinned to major versions (`@v4`, `@v3`, …). Dependabot or Renovate can keep them current.
