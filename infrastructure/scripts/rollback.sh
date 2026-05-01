#!/bin/bash
set -e

echo "Rolling back MedRecord AI deployment..."

cd /home/ubuntu/medrecord

# Restore from backup
if [ -f docker-compose.backup.yml ]; then
    docker-compose -f docker-compose.backup.yml up -d
    echo "Rollback successful"
else
    echo "No backup found"
    exit 1
fi
