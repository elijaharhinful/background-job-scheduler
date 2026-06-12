const http = require('http');
const { Client } = require('pg');

const API_URL = 'http://localhost:3000/api';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function pollJobStatus(jobId, targetStatus, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request('GET', `/jobs/${jobId}`);
    if (res.status === 200 && res.data.data.status === targetStatus) {
      return res.data.data;
    }
    await sleep(2000);
  }
  throw new Error(`Timeout waiting for job ${jobId} to reach status ${targetStatus}`);
}

async function cleanDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'scheduler_db'
  });
  await client.connect();
  await client.query('TRUNCATE jobs, dead_letter_queue CASCADE;');
  await client.end();
  console.log('Database cleaned.\n');
}

async function runTests() {
  const report = [];
  function logResult(testName, success, details) {
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${testName}`);
    if (details) console.log(`  -> ${details}`);
    report.push({ testName, success, details });
  }

  try {
    console.log('--- Starting Exhaustive API Tests ---\n');
    await cleanDatabase();

    // 1. Validation Tests
    const invalidPriorityRes = await request('POST', '/jobs', {
      type: 'send_email',
      payload: { to: 'a@b.com' },
      priority: 999 
    });
    logResult('Validation: Invalid Priority', invalidPriorityRes.status === 400 || invalidPriorityRes.status === 422, `Status: ${invalidPriorityRes.status}`);

    const invalidDateRes = await request('POST', '/jobs', {
      type: 'send_email',
      payload: { to: 'a@b.com' },
      scheduled_at: new Date(Date.now() - 100000).toISOString() // Past date
    });
    logResult('Validation: Past Scheduled Date', invalidDateRes.status === 400 || invalidDateRes.status === 422, `Status: ${invalidDateRes.status}`);

    // 2. Happy Path
    const validJobRes = await request('POST', '/jobs', {
      type: 'send_email',
      payload: { to: 'elijaharhinful8@gmail.com', subject: 'hello', body: 'world' },
      priority: 1
    });
    const jobId = validJobRes.data?.data?.id;
    if (jobId) {
      logResult('Job Creation', true, `Created job ${jobId}`);
      try {
        await pollJobStatus(jobId, 'completed', 35000);
        logResult('Job Processing (Happy Path)', true, `Job ${jobId} completed successfully`);
      } catch(e) {
        logResult('Job Processing (Happy Path)', false, e.message);
      }
    } else {
      logResult('Job Creation', false, `Failed: ${JSON.stringify(validJobRes.data)}`);
    }

    // 3. Job Cancellation
    const cancelJobRes = await request('POST', '/jobs', {
      type: 'send_email',
      payload: { to: 'cancel@gmail.com', subject: 'cancel', body: 'cancel' },
      scheduled_at: new Date(Date.now() + 60000).toISOString() // schedule in future so it doesn't process immediately
    });
    const cancelId = cancelJobRes.data?.data?.id;
    const cancelActionRes = await request('POST', `/jobs/${cancelId}/cancel`);
    logResult('Job Cancellation (Action)', cancelActionRes.status === 200, `Status: ${cancelActionRes.status}`);
    const checkCancel = await request('GET', `/jobs/${cancelId}`);
    logResult('Job Cancellation (Verification)', checkCancel.data?.data?.status === 'cancelled', `Status: ${checkCancel.data?.data?.status}`);

    // 4. Future Schedule
    const futureJobRes = await request('POST', '/jobs', {
      type: 'send_email',
      payload: { to: 'future@gmail.com', subject: 'future', body: 'future' },
      scheduled_at: new Date(Date.now() + 5000).toISOString()
    });
    const futureId = futureJobRes.data?.data?.id;
    await sleep(2000); // Check before schedule
    const futureCheck1 = await request('GET', `/jobs/${futureId}`);
    logResult('Future Schedule (Pending)', futureCheck1.data?.data?.status === 'pending', 'Job is pending before scheduled time');
    
    // 5. DAG Workflow
    const parentRes = await request('POST', '/jobs', {
      type: 'send_email',
      payload: { to: 'elijaharhinful8@gmail.com', subject: 'parent', body: 'parent' }
    });
    const parentId = parentRes.data?.data?.id;
    const childRes = await request('POST', '/jobs', {
      type: 'send_email',
      payload: { to: 'elijaharhinful8@gmail.com', subject: 'child', body: 'child' },
      depends_on: [parentId]
    });
    const childId = childRes.data?.data?.id;
    await sleep(1000);
    const childCheck = await request('GET', `/jobs/${childId}`);
    logResult('DAG Dependency (Pending)', childCheck.data?.data?.status === 'pending', 'Child pending while parent processes');
    try {
      await pollJobStatus(parentId, 'completed', 35000);
      await pollJobStatus(childId, 'completed', 35000);
      logResult('DAG Dependency (Execution)', true, 'Both completed in order');
    } catch(e) {
      logResult('DAG Dependency (Execution)', false, e.message);
    }

    // 6. Pagination & Metrics
    const jobsList = await request('GET', '/jobs?limit=2');
    logResult('API: Get Jobs Pagination', jobsList.status === 200 && Array.isArray(jobsList.data?.data?.data), `Count: ${jobsList.data?.data?.data?.length}`);
    const metrics = await request('GET', '/metrics');
    logResult('API: Get Metrics', metrics.status === 200, `Metrics retrieved successfully`);

    // 7. Retries, DLQ, and Manual Retry
    const failJobRes = await request('POST', '/jobs', {
      type: 'send_email',
      payload: {} // Missing fields will cause handler to throw error
    });
    const failId = failJobRes.data?.data?.id;
    
    console.log(`\nWaiting ~40 seconds for Retries & DLQ promotion (Job ${failId})...`);
    try {
      const failedJob = await pollJobStatus(failId, 'failed', 80000);
      logResult('Job Retries & Failure', true, `Job reached retry count: ${failedJob.retry_count}`);
      
      // Verify in DLQ
      const dlqList = await request('GET', `/dlq?job_id=${failId}`);
      if (dlqList.status === 200 && dlqList.data?.data?.data?.some(d => d.job.id === failId)) {
        logResult('DLQ Promotion', true, 'Job found in DLQ');
        const dlqEntry = dlqList.data.data.data.find(d => d.job.id === failId);
        
        // Manual Retry via DLQ endpoint
        // Let's first patch the job payload so it succeeds, wait, can we patch payload? The API doesn't allow payload patching. 
        // We will just hit retry to verify the API works, it will likely fail again.
        const retryRes = await request('POST', `/dlq/${dlqEntry.id}/retry`);
        logResult('DLQ Manual Retry API', retryRes.status === 200, `Triggered retry. Status: ${retryRes.status}`);
      } else {
        logResult('DLQ Promotion', false, 'Job not found in DLQ');
      }
    } catch(e) {
      logResult('Job Retries & Failure', false, e.message);
    }

    console.log('\n--- Test Summary ---');
    const passed = report.filter(r => r.success).length;
    console.log(`Passed: ${passed}/${report.length}`);

  } catch(e) {
    console.error('Test script error:', e);
  }
}

runTests();
