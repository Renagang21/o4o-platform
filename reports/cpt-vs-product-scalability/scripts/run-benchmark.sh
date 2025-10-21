#!/bin/bash
# ================================
# Master Benchmark Execution Script
# ================================
# This script orchestrates the complete benchmark process:
# 1. Setup tables
# 2. Generate sample data
# 3. Create indexes
# 4. Run benchmark queries
# 5. Collect results

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="o4o_user"
DB_PASSWORD="o4o_password123"
DB_NAME="o4o_platform"

PSQL="PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/../results"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}O4O Platform - CPT vs Product Benchmark${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ================================
# Step 1: Setup Tables
# ================================
echo -e "${YELLOW}Step 1: Setting up benchmark tables...${NC}"
$PSQL -f "${SCRIPT_DIR}/01-setup-benchmark-tables.sql" > "${RESULTS_DIR}/01-setup.log" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tables created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create tables${NC}"
    exit 1
fi

# ================================
# Step 2: Generate Sample Data
# ================================
echo -e "${YELLOW}Step 2: Generating sample data...${NC}"
echo -e "${YELLOW}   Choose scale: ${NC}"
echo "   1) 100K products (recommended)"
echo "   2) 300K products (extended testing)"
echo "   3) Custom amount"

read -p "Enter choice [1]: " SCALE_CHOICE
SCALE_CHOICE=${SCALE_CHOICE:-1}

case $SCALE_CHOICE in
    1)
        NUM_PRODUCTS=100000
        ;;
    2)
        NUM_PRODUCTS=300000
        ;;
    3)
        read -p "Enter number of products: " NUM_PRODUCTS
        ;;
    *)
        echo -e "${RED}Invalid choice. Using default: 100K${NC}"
        NUM_PRODUCTS=100000
        ;;
esac

echo -e "${YELLOW}Generating ${NUM_PRODUCTS} products...${NC}"

# Load data generation functions
$PSQL -f "${SCRIPT_DIR}/02-generate-sample-data.sql" > "${RESULTS_DIR}/02-load-functions.log" 2>&1

# Generate data for Option A (dedicated table)
echo -e "${YELLOW}   - Generating products for Option A (dedicated table)...${NC}"
$PSQL -c "SELECT generate_benchmark_products(${NUM_PRODUCTS});" > "${RESULTS_DIR}/02-generate-option-a.log" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✓ Option A data generated${NC}"
else
    echo -e "${RED}   ✗ Failed to generate Option A data${NC}"
    exit 1
fi

# Generate data for Option B (CustomPost)
echo -e "${YELLOW}   - Generating products for Option B (CustomPost)...${NC}"
$PSQL -c "SELECT generate_custompost_products(${NUM_PRODUCTS});" > "${RESULTS_DIR}/02-generate-option-b.log" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✓ Option B data generated${NC}"
else
    echo -e "${RED}   ✗ Failed to generate Option B data${NC}"
    exit 1
fi

# ================================
# Step 3: Create JSONB Indexes
# ================================
echo -e "${YELLOW}Step 3: Creating JSONB indexes for Option B...${NC}"
$PSQL -f "${SCRIPT_DIR}/03-create-jsonb-indexes.sql" > "${RESULTS_DIR}/03-jsonb-indexes.log" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ JSONB indexes created${NC}"
else
    echo -e "${RED}✗ Failed to create JSONB indexes${NC}"
    exit 1
fi

# ================================
# Step 4: Create Materialized View
# ================================
echo -e "${YELLOW}Step 4: Creating materialized view for Option C...${NC}"
$PSQL -f "${SCRIPT_DIR}/04-create-materialized-views.sql" > "${RESULTS_DIR}/04-materialized-view.log" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Materialized view created${NC}"
else
    echo -e "${RED}✗ Failed to create materialized view${NC}"
    exit 1
fi

# ================================
# Step 5: Update Statistics
# ================================
echo -e "${YELLOW}Step 5: Updating database statistics...${NC}"
$PSQL -c "ANALYZE benchmark_products; ANALYZE custom_posts; ANALYZE mv_product_search;" > "${RESULTS_DIR}/05-analyze.log" 2>&1
echo -e "${GREEN}✓ Statistics updated${NC}"

# ================================
# Step 6: Run Benchmark Queries
# ================================
echo -e "${YELLOW}Step 6: Running benchmark queries...${NC}"
echo -e "${YELLOW}   This may take several minutes...${NC}"

# Run with timing and detailed output
$PSQL -f "${SCRIPT_DIR}/05-benchmark-queries.sql" > "${RESULTS_DIR}/06-benchmark-results.txt" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Benchmark queries completed${NC}"
else
    echo -e "${RED}✗ Benchmark queries failed (check logs)${NC}"
fi

# ================================
# Step 7: Collect Metrics
# ================================
echo -e "${YELLOW}Step 7: Collecting performance metrics...${NC}"

cat > "${RESULTS_DIR}/07-metrics.sql" <<EOF
-- Table Sizes
SELECT 'Table Sizes' AS metric_type, '' AS detail, '' AS value
UNION ALL
SELECT 'benchmark_products' AS metric_type,
       'row_count' AS detail,
       COUNT(*)::TEXT AS value
FROM benchmark_products
UNION ALL
SELECT 'benchmark_products' AS metric_type,
       'total_size' AS detail,
       pg_size_pretty(pg_total_relation_size('benchmark_products')) AS value
UNION ALL
SELECT 'benchmark_products' AS metric_type,
       'indexes_size' AS detail,
       pg_size_pretty(pg_indexes_size('benchmark_products')) AS value
UNION ALL
SELECT 'custom_posts' AS metric_type,
       'row_count' AS detail,
       COUNT(*)::TEXT AS value
FROM custom_posts
WHERE "postTypeId" IN (SELECT id FROM custom_post_types WHERE slug = 'benchmark-product')
UNION ALL
SELECT 'custom_posts' AS metric_type,
       'total_size' AS detail,
       pg_size_pretty(pg_total_relation_size('custom_posts')) AS value
UNION ALL
SELECT 'custom_posts' AS metric_type,
       'indexes_size' AS detail,
       pg_size_pretty(pg_indexes_size('custom_posts')) AS value
UNION ALL
SELECT 'mv_product_search' AS metric_type,
       'row_count' AS detail,
       COUNT(*)::TEXT AS value
FROM mv_product_search
UNION ALL
SELECT 'mv_product_search' AS metric_type,
       'total_size' AS detail,
       pg_size_pretty(pg_total_relation_size('mv_product_search')) AS value
UNION ALL
SELECT 'mv_product_search' AS metric_type,
       'indexes_size' AS detail,
       pg_size_pretty(pg_indexes_size('mv_product_search')) AS value;

-- Index Details
\echo ''
\echo 'Index Details:'
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('benchmark_products', 'custom_posts', 'mv_product_search')
ORDER BY tablename, pg_relation_size(indexrelid) DESC;
EOF

$PSQL -f "${RESULTS_DIR}/07-metrics.sql" > "${RESULTS_DIR}/07-metrics-output.txt" 2>&1
echo -e "${GREEN}✓ Metrics collected${NC}"

# ================================
# Summary
# ================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Benchmark Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Results saved in: ${RESULTS_DIR}"
echo ""
echo "Files generated:"
echo "  - 06-benchmark-results.txt (main benchmark output)"
echo "  - 07-metrics-output.txt (size and index metrics)"
echo "  - *.log (detailed logs for each step)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review benchmark results"
echo "  2. Analyze query plans and timings"
echo "  3. Generate summary report"
echo ""
