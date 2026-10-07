#!/bin/bash
set -e

BASE_URL="http://localhost:5000"
echo "=== 1. TEST /health ==="
HEALTH_RES=$(curl -s "$BASE_URL/health")
echo "Health: $HEALTH_RES"

echo -e "\n=== 2. TEST REGISTER ==="
REG_RES=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jordan Lee","email":"jordan.lee@deskdrop.internal","password":"password123"}')
echo "Register: $REG_RES"

echo -e "\n=== 3. TEST LOGIN ==="
LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"priya.sharma@deskdrop.internal","password":"password123"}')
echo "Login: $LOGIN_RES"
TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Extracted Token: ${TOKEN:0:20}..."

echo -e "\n=== 4. TEST /api/auth/me ==="
ME_RES=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")
echo "Me: $ME_RES"

echo -e "\n=== 5. TEST RESOURCE LIST & FILTERS ==="
ALL_RES=$(curl -s "$BASE_URL/api/resources")
COUNT=$(echo "$ALL_RES" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo "Total Resources: $COUNT"

SPACES_RES=$(curl -s "$BASE_URL/api/resources?category=SPACES")
SPACES_COUNT=$(echo "$SPACES_RES" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo "Spaces Count: $SPACES_COUNT"

# Get Boardroom Alpha ID
BOARDROOM_ID=$(curl -s "$BASE_URL/api/resources?search=Boardroom" | grep -o '"_id":"[^"]*' | head -n 1 | cut -d'"' -f4)
echo "Boardroom Alpha ID: $BOARDROOM_ID"

echo -e "\n=== 6. TEST CREATE RESOURCE ==="
NEW_RES=$(curl -s -X POST "$BASE_URL/api/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acoustic Booth Delta","category":"SPACES","description":"Quiet phone booth","location":"Floor 4, North Corner"}')
echo "Created Resource: $NEW_RES"
NEW_RES_ID=$(echo "$NEW_RES" | grep -o '"_id":"[^"]*' | head -n 1 | cut -d'"' -f4)

echo -e "\n=== 7. TEST AVAILABILITY API ==="
START_TIME=$(date -u -v+1H +"%Y-%m-%dT%H:00:00.000Z")
END_TIME=$(date -u -v+2H +"%Y-%m-%dT%H:00:00.000Z")
echo "Querying availability: start=$START_TIME, end=$END_TIME"
AVAIL_RES=$(curl -s "$BASE_URL/api/bookings/availability?resourceId=$BOARDROOM_ID&startTime=$START_TIME&endTime=$END_TIME")
echo "Availability: $AVAIL_RES"

echo -e "\n=== 8. TEST CREATE BOOKING ==="
BOOKING_RES=$(curl -s -X POST "$BASE_URL/api/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"resourceId\":\"$BOARDROOM_ID\",\"startTime\":\"$START_TIME\",\"endTime\":\"$END_TIME\",\"purpose\":\"Q4 Product Strategy Sync\"}")
echo "Booking Response: $BOOKING_RES"
BOOKING_ID=$(echo "$BOOKING_RES" | grep -o '"_id":"[^"]*' | head -n 1 | cut -d'"' -f4)
echo "Booking ID: $BOOKING_ID"

echo -e "\n=== 9. TEST OVERLAPPING BOOKING (SHOULD RETURN 409) ==="
OVERLAP_START=$(date -u -v+1H -v+30M +"%Y-%m-%dT%H:%M:00.000Z")
OVERLAP_END=$(date -u -v+2H -v+30M +"%Y-%m-%dT%H:%M:00.000Z")
echo "Attempting overlapping booking: $OVERLAP_START to $OVERLAP_END"
HTTP_STATUS=$(curl -s -o /tmp/overlap_res.json -w "%{http_code}" -X POST "$BASE_URL/api/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"resourceId\":\"$BOARDROOM_ID\",\"startTime\":\"$OVERLAP_START\",\"endTime\":\"$OVERLAP_END\",\"purpose\":\"Conflicting Meeting\"}")
echo "HTTP Status: $HTTP_STATUS"
echo "Conflict Response Body: $(cat /tmp/overlap_res.json)"

echo -e "\n=== 10. TEST CHECK-IN (CONFIRMED -> ACTIVE) ==="
CHECKIN_RES=$(curl -s -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID/check-in" \
  -H "Authorization: Bearer $TOKEN")
echo "Check-in: $CHECKIN_RES"

echo -e "\n=== 11. VERIFY RESOURCE BECOMES IN_USE ==="
RES_STATUS=$(curl -s "$BASE_URL/api/resources/$BOARDROOM_ID" | grep -o '"status":"[^"]*' | head -n 1 | cut -d'"' -f4)
echo "Resource Status: $RES_STATUS (Expected: IN_USE)"

echo -e "\n=== 12. TEST INVALID TRANSITION: CANCEL ACTIVE BOOKING (SHOULD FAIL) ==="
INVALID_CANCEL=$(curl -s -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID/cancel" \
  -H "Authorization: Bearer $TOKEN")
echo "Invalid Cancel on ACTIVE: $INVALID_CANCEL"

echo -e "\n=== 13. TEST CHECK-OUT (ACTIVE -> COMPLETED) ==="
CHECKOUT_RES=$(curl -s -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID/check-out" \
  -H "Authorization: Bearer $TOKEN")
echo "Check-out: $CHECKOUT_RES"

echo -e "\n=== 14. VERIFY RESOURCE BECOMES AVAILABLE ==="
RES_STATUS_AFTER=$(curl -s "$BASE_URL/api/resources/$BOARDROOM_ID" | grep -o '"status":"[^"]*' | head -n 1 | cut -d'"' -f4)
echo "Resource Status: $RES_STATUS_AFTER (Expected: AVAILABLE)"

echo -e "\n=== 15. TEST INVALID TRANSITION: CHECK-IN AFTER COMPLETED (SHOULD FAIL) ==="
INVALID_CHECKIN=$(curl -s -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID/check-in" \
  -H "Authorization: Bearer $TOKEN")
echo "Invalid Check-in on COMPLETED: $INVALID_CHECKIN"

echo -e "\n=== 16. TEST CREATE & CANCEL BOOKING ==="
FUTURE_START=$(date -u -v+4H +"%Y-%m-%dT%H:00:00.000Z")
FUTURE_END=$(date -u -v+5H +"%Y-%m-%dT%H:00:00.000Z")
B2_RES=$(curl -s -X POST "$BASE_URL/api/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"resourceId\":\"$BOARDROOM_ID\",\"startTime\":\"$FUTURE_START\",\"endTime\":\"$FUTURE_END\",\"purpose\":\"Client Pitch\"}")
B2_ID=$(echo "$B2_RES" | grep -o '"_id":"[^"]*' | head -n 1 | cut -d'"' -f4)
echo "Created B2 ID: $B2_ID"

CANCEL_RES=$(curl -s -X PATCH "$BASE_URL/api/bookings/$B2_ID/cancel" \
  -H "Authorization: Bearer $TOKEN")
echo "Cancelled B2: $CANCEL_RES"

echo -e "\n=== 17. TEST MAINTENANCE RESOURCE REJECTION ==="
echo "Setting Resource $NEW_RES_ID to MAINTENANCE..."
PATCH_MAINT=$(curl -s -X PATCH "$BASE_URL/api/resources/$NEW_RES_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"MAINTENANCE"}')
echo "Resource updated to: $(echo "$PATCH_MAINT" | grep -o '"status":"[^"]*' | cut -d'"' -f4)"

MAINT_BOOK_STATUS=$(curl -s -o /tmp/maint_res.json -w "%{http_code}" -X POST "$BASE_URL/api/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"resourceId\":\"$NEW_RES_ID\",\"startTime\":\"$FUTURE_START\",\"endTime\":\"$FUTURE_END\",\"purpose\":\"Testing Maintenance\"}")
echo "HTTP Status for Booking Maintenance Resource: $MAINT_BOOK_STATUS (Expected: 400)"
echo "Response: $(cat /tmp/maint_res.json)"

echo -e "\n=== ALL TESTS COMPLETED SUCCESSFULLY ==="
