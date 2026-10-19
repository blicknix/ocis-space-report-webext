#!/usr/bin/env bash
# Creates test data in the local dev oCIS: project spaces with quotas and files,
# personal spaces with data, and one project that only einstein manages.
# Needs: curl, jq. Run after `docker compose up` once https://localhost:9200 answers.
set -euo pipefail
BASE=${OCIS_URL:-https://localhost:9200}
ADMIN=${ADMIN:-admin:admin}
C=(curl -ksS --fail-with-body)
MANAGER_ROLE=312c0871-5ef7-4b3a-85b6-0e4074c64049
MiB=$((1024 * 1024))

upload() { # <user:pw> <driveId> <name> <MiB>
  head -c $(($4 * MiB)) /dev/urandom | "${C[@]}" -u "$1" -X PUT --data-binary @- \
    "$BASE/dav/spaces/$(jq -rn --arg s "$2" '$s|@uri')/$3" -o /dev/null
}
project() { # <name> <quota MiB>  -> prints drive id
  "${C[@]}" -u "$ADMIN" -H 'Content-Type: application/json' \
    -d "{\"name\":\"$1\",\"quota\":{\"total\":$(($2 * MiB))}}" \
    "$BASE/graph/v1beta1/drives" | jq -r .id
}
personal() { # <user:pw> -> personal drive id (first request also creates it)
  "${C[@]}" -u "$1" "$BASE/graph/v1beta1/me/drives?%24filter=driveType%20eq%20personal" | jq -r '.value[0].id'
}
user_id() { "${C[@]}" -u "$ADMIN" "$BASE/graph/v1.0/users/$1" | jq -r .id; }

echo "== personal spaces"
for u in einstein:relativity marie:radioactivity richard:superfluidity katherine:gemini; do
  id=$(personal "$u"); upload "$u" "$id" "data.bin" $((RANDOM % 40 + 5)); echo "  ${u%%:*}"
done

echo "== project spaces"
for spec in "Institut Physik:200" "IT-Betrieb:100" "Lehre Mathematik:50" "Fast voll:20"; do
  id=$(project "${spec%%:*}" "${spec##*:}"); upload "$ADMIN" "$id" "data.bin" $(( ${spec##*:} * 9 / 10 ))
  echo "  ${spec%%:*}"
done

echo "== 'Einstein only' project (becomes orphaned after dev/make-orphan.sh)"
id=$(project "Einstein only" 100); upload "$ADMIN" "$id" "data.bin" 12
eid=$(user_id einstein); aid=$(user_id admin)
"${C[@]}" -u "$ADMIN" -H 'Content-Type: application/json' -o /dev/null \
  -d "{\"recipients\":[{\"objectId\":\"$eid\",\"@libre.graph.recipient.type\":\"user\"}],\"roles\":[\"$MANAGER_ROLE\"]}" \
  "$BASE/graph/v1beta1/drives/$(jq -rn --arg s "$id" '$s|@uri')/root/invite"
"${C[@]}" -u "$ADMIN" -X DELETE -o /dev/null \
  "$BASE/graph/v1beta1/drives/$(jq -rn --arg s "$id" '$s|@uri')/root/permissions/u:$aid"
echo "done. Open $BASE/space-report"
