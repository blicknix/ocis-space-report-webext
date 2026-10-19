#!/usr/bin/env bash
# Deletes a user directly in oCIS' built-in LDAP (IDM), the way a user disappears when it is
# removed in Keycloak/LDAP. Deleting through oCIS (Admin Settings / Graph API) would also delete
# the personal space, so it would NOT leave an orphan.
#   dev/make-orphan.sh einstein
set -euo pipefail
USER_UID=${1:-einstein}
CT=${CT:-ocis-space-report-dev}
PW=$(docker exec "$CT" sh -c "grep -A6 'service_user_passwords:' /etc/ocis/ocis.yaml | sed -n 's/^ *idm_password: *//p'" | tr -d "\"'")
docker run --rm --network "container:$CT" -e LDAPTLS_REQCERT=never \
  --entrypoint ldapdelete bitnami/openldap:latest \
  -H ldaps://127.0.0.1:9235 -x -D 'uid=libregraph,ou=sysusers,o=libregraph-idm' -w "$PW" \
  "uid=$USER_UID,ou=users,o=libregraph-idm"
echo "deleted $USER_UID in IDM -> refresh the space report"
