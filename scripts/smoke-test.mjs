const base = 'http://localhost:8787';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(path, options = {}) {
  const res = await fetch(base + path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path}: ${res.status} ${data.error || ''}`);
  return data;
}

const run = async () => {
  const health = await json('/api/health');
  console.log('health:', health.ok);

  const config = await json('/api/config');
  console.log('packages:', config.packages.length, 'serial cost:', config.costs.serial);

  const auth = await json('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  console.log('auth:', auth.user.firstName, auth.user.credits, 'admin:', auth.user.isAdmin);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${auth.token}`
  };

  const me = await json('/api/me', { headers });
  console.log('me: works', me.works.length, 'credits', me.user.credits);

  const image = await json('/api/generate/image', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: 'neon cinematic portrait of a traveler',
      style: 'cinematic',
      ratio: '9:16',
      count: 1
    })
  });
  console.log('image job:', image.job.id, image.job.status, 'credits:', image.user.credits);

  await sleep(7600);
  const imageDone = await json(`/api/jobs/${image.job.id}`, { headers });
  console.log(
    'image done:',
    imageDone.job.status,
    imageDone.job.progress,
    'images:',
    imageDone.job.result?.images?.length
  );

  const serial = await json('/api/generate/serial', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      idea: 'Yomgirli Toshkentda hacker qiz suniy intellekt sirini ochadi',
      genre: 'mystery',
      style: 'anime',
      episodes: 3,
      duration: 60,
      voice: 'female'
    })
  });
  console.log('serial job:', serial.job.id, serial.job.status, 'credits:', serial.user.credits);

  await sleep(18500);
  const serialDone = await json(`/api/jobs/${serial.job.id}`, { headers });
  const work = serialDone.job.result;
  console.log(
    'serial done:',
    serialDone.job.status,
    serialDone.job.progress,
    work?.title,
    'episodes:',
    work?.story?.episodes?.length,
    'frames:',
    work?.story?.episodes?.[0]?.scenes?.length
  );
  console.log('caption:', work?.story?.episodes?.[0]?.scenes?.[0]?.caption);
  console.log('SMOKE OK');
};

run().catch((err) => {
  console.error('SMOKE FAILED:', err.message);
  process.exitCode = 1;
});
