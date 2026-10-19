# Carrier image for the oCIS Helm chart: an init container copies the built extension
# into the web pod's apps volume. Same layout as the official owncloud/web-extensions images
# (/var/lib/nginx/html/<app>), so the Helm values stay the same if it is ever published there.
#   npm ci && npm run build
#   docker build -t registry.example.org/ocis/space-report:0.1.0 .
FROM busybox:1.37
COPY dist/ /var/lib/nginx/html/space-report/
USER 65534
CMD ["true"]
