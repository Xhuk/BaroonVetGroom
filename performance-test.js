#!/usr/bin/env node

// Performance test script to demonstrate API optimization
const fetch = require('http').get;
const { performance } = require('perf_hooks');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = fetch(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const end = performance.now();
        resolve({ status: res.statusCode, time: end - start, size: data.length });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
  });
}

async function testOldApproach() {
  console.log('🔍 Testing OLD approach (6 separate API calls)...');
  const start = performance.now();
  
  const endpoints = [
    'http://localhost:5000/api/appointments/vetgroom1',
    'http://localhost:5000/api/clients/vetgroom1', 
    'http://localhost:5000/api/pets/vetgroom1',
    'http://localhost:5000/api/rooms/vetgroom1',
    'http://localhost:5000/api/staff/vetgroom1',
    'http://localhost:5000/api/services/vetgroom1'
  ];
  
  try {
    const results = await Promise.all(endpoints.map(makeRequest));
    const end = performance.now();
    const totalTime = end - start;
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);
    
    console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`   📦  Total data: ${totalSize} bytes`);
    console.log(`   🌐  Network requests: 6`);
    return { time: totalTime, size: totalSize, requests: 6 };
  } catch (error) {
    console.log(`   ❌  Error: ${error.message}`);
    return null;
  }
}

async function testNewApproach() {
  console.log('🚀 Testing NEW approach (1 combined API call)...');
  const start = performance.now();
  
  try {
    const result = await makeRequest('http://localhost:5000/api/appointments-data/vetgroom1');
    const end = performance.now();
    const totalTime = end - start;
    
    console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`   📦  Total data: ${result.size} bytes`);  
    console.log(`   🌐  Network requests: 1`);
    return { time: totalTime, size: result.size, requests: 1 };
  } catch (error) {
    console.log(`   ❌  Error: ${error.message}`);
    return null;
  }
}

async function runPerformanceTest() {
  console.log('🧪 APPOINTMENT SCREEN PERFORMANCE TEST');
  console.log('=====================================');
  
  const oldResult = await testOldApproach();
  console.log('');
  const newResult = await testNewApproach();
  
  if (oldResult && newResult) {
    console.log('');
    console.log('📊 PERFORMANCE COMPARISON');
    console.log('=========================');
    
    const timeImprovement = ((oldResult.time - newResult.time) / oldResult.time * 100);
    const requestReduction = ((oldResult.requests - newResult.requests) / oldResult.requests * 100);
    
    console.log(`⚡ Speed improvement: ${timeImprovement.toFixed(1)}% faster`);
    console.log(`🌐 Network reduction: ${requestReduction.toFixed(0)}% fewer requests`);
    console.log(`📈 Old: ${oldResult.time.toFixed(2)}ms vs New: ${newResult.time.toFixed(2)}ms`);
    
    if (timeImprovement > 0) {
      console.log('✅ OPTIMIZATION SUCCESSFUL!');
    } else {
      console.log('⚠️  No significant improvement detected');
    }
  }
}

runPerformanceTest().catch(console.error);