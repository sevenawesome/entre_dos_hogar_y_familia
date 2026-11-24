// Screenshot fixture for the disposable iOS simulator only. Authenticate the
// isolated member normally, then preload its persisted session so screenshots
// do not depend on automated interaction with the iOS secure keyboard.
// Storage layout: AsyncStorage 2.2.0; session format: Firebase Auth 12.19.0.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

async function main() {
  if (process.platform !== 'darwin') throw Error('Disposable macOS simulator required');
  const simulator = process.argv[2];
  if (!/^[A-F0-9-]{36}$/i.test(simulator || '')) throw Error('Simulator UUID required');
  const account = JSON.parse(fs.readFileSync(process.env.APP_STORE_REVIEW_ACCOUNT_FILE, 'utf8'));
  if (account.email !== 'sevenawesome.srl+apple.review@gmail.com' || !account.uid || account.password?.length < 8) {
    throw Error('Only the isolated review member may be used for screenshots');
  }
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw Error('Production Firebase client configuration unavailable');
  async function auth(method, body) {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw Error('Review member authentication failed: ' + (result.error?.message || response.status));
    return result;
  }
  const session = await auth('signInWithPassword', { email: account.email, password: account.password, returnSecureToken: true });
  if (session.localId !== account.uid) throw Error('Unexpected screenshot member');
  const user = (await auth('lookup', { idToken: session.idToken })).users?.[0];
  if (!user?.emailVerified || user.disabled) throw Error('Review member must be verified and active');
  const claims = JSON.parse(Buffer.from(session.idToken.split('.')[1], 'base64url').toString('utf8'));
  const roleResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${claims.aud}/databases/(default)/documents/roles/${account.uid}`, {
    headers: { Authorization: 'Bearer ' + session.idToken },
  });
  const role = await roleResponse.json();
  if (!roleResponse.ok || role.fields?.role?.stringValue !== 'member') throw Error('Screenshot account must be an ordinary member');
  const bundle = 'com.sevenawesome.entredos';
  const container = execFileSync('xcrun', ['simctl', 'get_app_container', simulator, bundle, 'data'], { encoding: 'utf8' }).trim();
  const normalized = container.toLowerCase();
  if (!normalized.includes(`/coresimulator/devices/${simulator.toLowerCase()}/`) || !normalized.includes('/containers/data/application/')) {
    throw Error('Refusing to write outside the selected disposable simulator');
  }
  const directory = path.join(container, 'Library', 'Application Support', bundle, 'RCTAsyncLocalStorage_V1');
  fs.mkdirSync(directory, { recursive: true });
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  manifest[`firebase:authUser:${apiKey}:[DEFAULT]`] = JSON.stringify({
    uid: account.uid, email: account.email, emailVerified: true, isAnonymous: false,
    providerData: [{ providerId: 'password', uid: account.email, displayName: null, email: account.email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: session.refreshToken, accessToken: session.idToken, expirationTime: Date.now() + Number(session.expiresIn) * 1000 },
    createdAt: user.createdAt, lastLoginAt: user.lastLoginAt, apiKey, appName: '[DEFAULT]',
  });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest), { mode: 0o600 });
  console.log('Authenticated private member session prepared for the disposable simulator.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
