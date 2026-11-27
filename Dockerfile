# syntax=docker/dockerfile:1
# KubeSetu marketing site — static files served by unprivileged NGINX.
# Runs as UID 101, listens on 8080, works with a read-only root filesystem
# (mount writable emptyDirs at /tmp and /var/cache/nginx — see k8s/base/deployment.yaml).
FROM nginxinc/nginx-unprivileged:1.28.0-alpine

LABEL org.opencontainers.image.title="kubesetu-site" \
      org.opencontainers.image.description="KubeSetu static website served by unprivileged NGINX" \
      org.opencontainers.image.source="https://github.com/kirtan-ict/Jai-Hanuman-Dada-Jai-Sawariya-Seth-Project_Kubernet" \
      org.opencontainers.image.licenses="NOASSERTION"

# Remove the stock welcome pages (needs root briefly), then drop back to the nginx user.
USER 0
RUN rm -rf /usr/share/nginx/html/*
USER 101

# Files stay root-owned and read-only to the nginx user (immutable content).
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docs/ /usr/share/nginx/html/

ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
