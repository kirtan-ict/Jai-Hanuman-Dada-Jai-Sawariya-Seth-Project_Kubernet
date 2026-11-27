# Jai Hanuman Dada Jai Sawariya Seth Project – Kubernetes

**KubeSetu** — a Kubernetes infrastructure implementation & support website, plus starter Kubernetes manifests.

## Structure

```
docs/                     Static website (plain HTML/CSS/JS, no build step)
  index.html              Home
  services.html           Services (assessment, build, migration, GitOps, security, FinOps, AI, training…)
  infrastructure.html     Overview of all infrastructure types
  infra-*.html            8 infrastructure pages with reference-architecture diagrams
                          (managed cloud, on-prem, bare metal, edge, hybrid,
                           enterprise platforms, air-gapped, GPU & AI)
  support.html            Support plans, SLA tables, engagement models
  assessment.html         Interactive Kubernetes readiness assessment
  cost-estimator.html     Interactive cluster cost estimator
  decision-guide.html     "Which Kubernetes platform fits you?" tool
  resources.html          Upgrade guidance, checklists, runbooks, glossary
  industries.html         Industries overview + 7 industry-*.html pages
  blog.html               Blog index + 6 blog-*.html articles
  about.html, contact.html, 404.html, sitemap.xml, robots.txt
  _template.html          Header/footer template every page is built from
  assets/css/style.css    Shared design system (light + dark mode)
  assets/js/main.js       Shared behaviour (nav, theme, footer year)
k8s/base, k8s/overlays/   Kustomize manifests to run the site on Kubernetes (dev + prod)
deploy/nginx/             nginx config used by the Dockerfile
.github/workflows/        CI (link check, manifest validation, image build) + GitHub Pages
Dockerfile                Unprivileged nginx image serving docs/
DEPLOYMENT.md             Docker, Kubernetes and GitHub Pages deployment guide
serve.ps1                 Local preview server for Windows (no Python/Node needed)
```

## View the site locally

Double-click `docs/index.html`, or run the preview server (Windows PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
# then open http://localhost:8080
```

With Python installed you can instead run `python -m http.server 8080` inside `docs/`.

## Before going live

Search the site for `EDIT` — placeholders for real prices, contact email/phone,
company stats and certifications are marked with `<!-- EDIT ... -->` comments.

## Publish with GitHub Pages (optional)

Repository **Settings → Pages → Build and deployment → Deploy from a branch →
`main` / `/docs`**.
