#!/bin/bash

echo "=== API Performance Test ==="
echo "Testing endpoint: http://localhost:4000/health"
echo ""

# Test with different concurrency levels
for concurrent in 1 10 50 100; do
    echo "Testing with $concurrent concurrent requests (1000 total)..."
    
    # Use apache bench for testing
    if command -v ab &> /dev/null; then
        ab -n 1000 -c $concurrent -q http://localhost:4000/health 2>/dev/null | \
            grep -E "Requests per second:|Time per request:|Percentage|Total:"
    else
        # Fallback to curl if ab not available
        echo "Apache Bench not found, using curl..."
        
        times=()
        for i in {1..100}; do
            response_time=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:4000/health)
            times+=($response_time)
        done
        
        # Calculate statistics
        IFS=$'\n' sorted=($(sort -n <<<"${times[*]}"))
        unset IFS
        
        count=${#sorted[@]}
        p50_index=$((count * 50 / 100))
        p95_index=$((count * 95 / 100))
        p99_index=$((count * 99 / 100))
        
        echo "  P50: ${sorted[$p50_index]}s"
        echo "  P95: ${sorted[$p95_index]}s"
        echo "  P99: ${sorted[$p99_index]}s"
    fi
    echo ""
done

echo "=== Response Time Analysis ==="
echo "Testing 100 sequential requests..."

total_time=0
min_time=999999
max_time=0
times=()

for i in {1..100}; do
    response_time=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:4000/health)
    times+=($response_time)
    
    # Update stats
    total_time=$(echo "$total_time + $response_time" | bc)
    
    if (( $(echo "$response_time < $min_time" | bc -l) )); then
        min_time=$response_time
    fi
    
    if (( $(echo "$response_time > $max_time" | bc -l) )); then
        max_time=$response_time
    fi
    
    # Show progress
    if [ $((i % 20)) -eq 0 ]; then
        echo -n "."
    fi
done
echo ""

# Calculate average
avg_time=$(echo "scale=6; $total_time / 100" | bc)

# Sort times for percentile calculation
IFS=$'\n' sorted=($(sort -n <<<"${times[*]}"))
unset IFS

# Calculate percentiles
p50=${sorted[49]}
p95=${sorted[94]}
p99=${sorted[98]}

echo ""
echo "=== Results Summary ==="
echo "Total Requests: 100"
echo "Min Response Time: ${min_time}s"
echo "Max Response Time: ${max_time}s"
echo "Average Response Time: ${avg_time}s"
echo "P50 (Median): ${p50}s"
echo "P95: ${p95}s"
echo "P99: ${p99}s"

# Check for slow responses
slow_count=0
for time in "${times[@]}"; do
    if (( $(echo "$time > 1" | bc -l) )); then
        ((slow_count++))
    fi
done

echo ""
if [ $slow_count -gt 0 ]; then
    echo "⚠️  WARNING: $slow_count requests took longer than 1 second"
else
    echo "✅ All requests completed within 1 second"
fi

# Test other endpoints
echo ""
echo "=== Testing Other Endpoints ==="
endpoints=(
    "/api/health"
    "/api/v1/platform/config"
    "/api/products"
)

for endpoint in "${endpoints[@]}"; do
    echo -n "Testing $endpoint: "
    response=$(curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s" http://localhost:4000$endpoint)
    echo "$response"
done