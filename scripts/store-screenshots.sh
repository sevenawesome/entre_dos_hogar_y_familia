#!/usr/bin/env bash
set -euo pipefail

# The isolated App Review member account is a secret file in Expo Services.
# Keep credentials and Maestro output out of uploaded artifacts.
if [[ ! -f "${APP_STORE_REVIEW_ACCOUNT_FILE:?Missing review account secret file}" ]]; then
  echo 'The review account secret file is not available on the worker.'
  exit 1
fi
if [[ ! -d "${SIMULATOR_APP_PATH:?Missing simulator app}" ]]; then
  echo 'The downloaded artifact does not point to an installed app directory.'
  exit 1
fi
echo 'Capture inputs are available.'
curl -fsSL https://get.maestro.mobile.dev | bash
export PATH="$HOME/.maestro/bin:$PATH"
export MAESTRO_DRIVER_STARTUP_TIMEOUT=180000

mkdir -p .cache/store-captures
xcrun simctl list devices available --json > .cache/store-devices.json
node <<'NODE' > .cache/store-devices.tsv
const fs = require('fs');
const devices = Object.values(JSON.parse(fs.readFileSync('.cache/store-devices.json', 'utf8')).devices).flat();
for (const [kind, pattern] of [['iphone', /^iPhone.*(?:Pro Max|Plus)/], ['ipad', /^iPad Pro.*13/]]) {
  const device = devices.filter(d => d.isAvailable && pattern.test(d.name)).sort((a,b) => b.name.localeCompare(a.name, undefined, {numeric:true}))[0];
  if (!device) throw Error('Missing required ' + kind + ' simulator');
  console.error(kind + ': ' + device.name);
  console.log(kind + '\t' + device.udid);
}
NODE

capture_failed=0
while IFS=$'\t' read -r kind simulator; do
  xcrun simctl boot "$simulator" || true
  xcrun simctl bootstatus "$simulator" -b
  echo "Configuring the disposable $kind simulator."
  xcrun simctl ui "$simulator" appearance light
  xcrun simctl status_bar "$simulator" override --time '9:41' --batteryState charged --batteryLevel 100
  xcrun simctl install "$simulator" "$SIMULATOR_APP_PATH"
  node scripts/prepare-store-screenshot-session.cjs "$simulator"
  echo "Starting native $kind capture."
  if ! maestro --device "$simulator" test --test-output-dir "$PWD/.cache/store-captures/$kind" .maestro/store-screenshots.yaml > "${TMPDIR:-/tmp}/amor-capture-$kind.log" 2>&1; then
    echo "Native capture failed on $kind. Showing sanitized diagnostics only."
    maestro --device "$simulator" hierarchy > "${TMPDIR:-/tmp}/amor-hierarchy-$kind.json" 2>/dev/null || true
    export CAPTURE_HIERARCHY="${TMPDIR:-/tmp}/amor-hierarchy-$kind.json"
    export CAPTURE_FAILURE_LOG="${TMPDIR:-/tmp}/amor-capture-$kind.log"
    node <<'NODE'
const fs = require('fs');
let log = fs.readFileSync(process.env.CAPTURE_FAILURE_LOG, 'utf8');
const account = JSON.parse(fs.readFileSync(process.env.APP_STORE_REVIEW_ACCOUNT_FILE, 'utf8'));
for (const secret of [account.email, account.password]) {
  if (secret) log = log.split(secret).join('[REDACTED]');
}
console.log(log.split('\n').filter(line => /failed|error|exception|timeout|not found|assertion|unable/i.test(line)).slice(-15).join('\n'));
try {
  const raw = fs.readFileSync(process.env.CAPTURE_HIERARCHY, 'utf8');
  const hierarchy = JSON.parse(raw.slice(raw.indexOf('{')));
  function visit(node) {
    const a = node.attributes || {};
    const fixedText = /^(Contraseña|Al menos 8 caracteres|Correo de la pareja|su\.correo@ejemplo\.com)$/;
    if (Object.values(a).some(v => typeof v === 'string' && fixedText.test(v))) {
      const safe = {};
      for (const [key,value] of Object.entries(a)) {
        if (/bounds|class|type|resource|focused|focusable|enabled|clickable|editable/i.test(key) || typeof value === 'boolean') safe[key]=value;
        else if (typeof value === 'string' && fixedText.test(value)) safe[key]=value;
      }
      console.log('Input selector diagnostics: '+JSON.stringify(safe));
    }
    for (const child of node.children || []) visit(child);
  }
  visit(hierarchy);
} catch { console.log('Input selector diagnostics unavailable.'); }
NODE
    capture_failed=1
  fi
  echo "Native $kind capture finished."
  xcrun simctl shutdown "$simulator"
done < .cache/store-devices.tsv
exit "$capture_failed"
