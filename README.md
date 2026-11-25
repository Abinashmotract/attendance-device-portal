# Device Portal

Your own biometric admin panel for the Python device SDK in `python2412`. It is a separate project from the school ERP and from the Timy cloud website.

Timy cloud stays the path for a device that is registered on Timy. This portal is the path for a device whose WebSocket points at this computer.

## What it includes

| Screen | What you can do |
|---|---|
| Dashboard | Gateway status, open sockets, people count, punch count, ERP forwarding |
| Devices | Live sockets, sync time, device info, pull logs, open door, reboot |
| People | Save an enroll id, card, password, and push or delete that user on a device |
| Attendance | Punches stored by the gateway |
| Access | Access-day schedules and the command queue |
| Settings | Gateway URL and secret, then a connection test |
| API Docs | Every JSON route the panel uses |

## Run it

1. Start the Python gateway:

```bash
cd /home/abinash/Documents/abinash/erp/python2412/python2412/FlaskProject
.venv/bin/python app.py
```

The gateway listens on port **7788**.

2. Start this panel:

```bash
cd /home/abinash/Documents/abinash/erp/device-portal
npm install
npm run dev
```

Open `http://127.0.0.1:5174`.

3. In **Settings**, set the gateway URL to `http://127.0.0.1:7788` and the same secret as `GATEWAY_API_SECRET` in the gateway `.env`. Save and test. Health should say Online.

## Point a device at this gateway

On the biometric device, set the server to:

`ws://<this-computer-lan-ip>:7788/pub/chat`

Use the LAN address, for example `ws://192.168.1.48:7788/pub/chat`. `127.0.0.1` only works on this computer, not on the device.

After the device connects, **Devices** shows that serial as Online.

A device uses one server. When it points here, it leaves Timy cloud and the Timy website will show it offline. Do not put this WebSocket URL into the Timy webhook settings.

## MySQL

The gateway stores devices, people, punches, and the command queue in the `fingerprint` database from `config/set.conf`. If that login fails, the panel still opens and shows the socket count, but lists and commands return a database error. Create the database, import `fingerprint.sql`, and put a password login in `[db]`.

## How a punch moves

1. The device sends `sendlog` on the WebSocket.
2. The gateway stores the punch and answers the device.
3. If `ERP_ATTENDANCE_URL` is set, the gateway POSTs the punch to the ERP webhook. The time string stays the device wall clock.

## API

All routes are under `http://127.0.0.1:7788/api`. Send `X-Gateway-Secret` when a secret is configured.

| Method | Path | Body |
|---|---|---|
| GET | `/api/health` | |
| GET | `/api/dashboard` | |
| GET | `/api/devices` | |
| POST | `/api/devices/time` | `{ "deviceSn": "SERIAL" }` |
| POST | `/api/devices/info` | `{ "deviceSn": "SERIAL" }` |
| POST | `/api/devices/reboot` | `{ "deviceSn": "SERIAL" }` |
| POST | `/api/logs/pull` | `{ "deviceSn": "SERIAL", "full": false }` |
| POST | `/api/door/open` | `{ "deviceSn": "SERIAL", "doorNum": 1 }` |
| GET | `/api/persons` | |
| POST | `/api/persons` | `{ "enrollId": 1, "name": "Asha", "cardNum": "", "password": "", "deviceSn": "", "push": false }` |
| POST | `/api/persons/push` | `{ "deviceSn": "SERIAL", "enrollId": 1, "backupNum": 11, "name": "Asha", "record": "1234" }` |
| POST | `/api/persons/delete` | `{ "deviceSn": "SERIAL", "enrollId": 1 }` |
| GET | `/api/records?limit=50` | |
| GET | `/api/access-days` | |
| GET | `/api/commands` | |
| POST | `/api/commands` | `{ "deviceSn": "SERIAL", "name": "getuserlist", "payload": { "stn": true } }` |

`backupNum` `10` is a password, `11` is a card, `50` is a face photo, and `-1` sends the name only.

Commands are rows in `machine_command`. The gateway sends the next waiting row on the open socket about once a second.
# attendance-device-portal
