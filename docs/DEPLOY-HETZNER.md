# Deploy Binonce on a Hetzner VPS

This app is a single Next.js 14 server (frontend + API routes). It needs a
**persistent** box (not serverless) because the Sepolia Safe route shells out to
the `chainwall` CLI + Foundry `cast` + a local keystore. A Hetzner Cloud VM runs
all of it. Target: Ubuntu 24.04, `~/.local/bin/chainwall`, `~/.foundry/bin/cast`,
keystores in `~/.foundry/keystores`, chainwall config in `~/.config/chainwall`.

Commands are grouped. `LOCAL$` runs on your laptop, `VPS$` runs on the server.

---

## 1. Create the server (Hetzner Cloud)

```bash
# Hetzner Cloud Console: create a CX22 (2 vCPU / 4 GB) or larger, image Ubuntu 24.04,
# add your SSH key. Note the public IP, then from your laptop:
LOCAL$ ssh root@<SERVER_IP>
```

## 2. Base box + a deploy user

```bash
VPS$ apt update && apt -y upgrade
VPS$ apt -y install git curl build-essential ufw
VPS$ adduser --disabled-password --gecos "" deploy && usermod -aG sudo deploy
VPS$ rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copy your SSH key to the deploy user
VPS$ ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
VPS$ su - deploy    # everything below runs as `deploy`
```

## 3. Node 20 LTS (Next 14 needs Node ≥ 18.17)

```bash
VPS$ curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
VPS$ sudo apt -y install nodejs
VPS$ node -v   # expect v20.x
VPS$ sudo npm i -g pm2
```

## 4. Foundry (`cast`) — pin ≥ 1.8.6

```bash
VPS$ curl -L https://foundry.paradigm.xyz | bash
VPS$ source ~/.bashrc
VPS$ foundryup -i 1.8.6
VPS$ ~/.foundry/bin/cast --version   # >= 1.8.6, required by the Safe route
```

## 5. Clone + build the app

```bash
VPS$ cd ~ && git clone https://github.com/Thirumurugan7/Binonce.git app
VPS$ cd ~/app && git checkout defense-wallet-flow
VPS$ npm install
VPS$ npm run build         # fails fast if env/types are wrong; fix before running
```

## 6. Copy the local-only artifacts to the server

These are NOT in git — transfer them from your laptop with `scp`. Keep them to
this box; they are private keys.

```bash
# the chainwall CLI binary (v0.3.1)
LOCAL$ scp ~/.local/bin/chainwall deploy@<SERVER_IP>:/home/deploy/.local/bin/chainwall
VPS$   mkdir -p ~/.local/bin && chmod +x ~/.local/bin/chainwall && ~/.local/bin/chainwall --version

# Foundry keystores (wc-owner, wc-relayer, wc-approver2, wc-approver3) + the password file
LOCAL$ scp -r ~/.foundry/keystores deploy@<SERVER_IP>:/home/deploy/.foundry/keystores
LOCAL$ scp ~/.config/chainwall-wc.pw deploy@<SERVER_IP>:/home/deploy/.config/chainwall-wc.pw

# chainwall profiles (whitechain + sepolia) and its sqlite/journal
LOCAL$ scp -r ~/.config/chainwall deploy@<SERVER_IP>:/home/deploy/.config/chainwall

# the gitignored env files (keys, RPCs, Privy app id)
LOCAL$ cd ~/Desktop/ethIndia/EIP7702-offend-defend
LOCAL$ scp .env .env.whitechain .env.relayer .env.approver3 deploy@<SERVER_IP>:/home/deploy/app/
VPS$   chmod 600 ~/.config/chainwall-wc.pw ~/app/.env*     # lock down secrets
```

> The app reads `.env` directly (Next loads it). Make sure `.env` has
> `DEFENSE_MODE=testnet` (not `fork`) and the Sepolia vars
> (`DEFENSE_SEPOLIA_RPC`, `SAFE_DEFENSE_RPC`, `SAFE_*_ACCOUNT`) if you want the Safe route.
> The code looks for the binaries at `~/.local/bin/chainwall`, `~/.foundry/bin/cast`,
> and the password file at `~/.config/chainwall-wc.pw` — override with
> `CHAINWALL_BIN`, `CAST_BIN`, `CHAINWALL_PW_FILE`, `CHAINWALL_PROFILE` in `.env` if paths differ.

## 7. Run it with pm2 (survives reboots)

```bash
VPS$ cd ~/app
VPS$ pm2 start "npm run start" --name binonce        # Next serves on :3000
VPS$ pm2 save
VPS$ pm2 startup systemd -u deploy --hp /home/deploy  # run the line it prints, with sudo
VPS$ pm2 logs binonce --lines 50                      # verify it booted
```

## 8. Reverse proxy + HTTPS (Caddy = automatic TLS)

```bash
VPS$ sudo apt -y install debian-keyring debian-archive-keyring apt-transport-https
VPS$ curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
VPS$ curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
VPS$ sudo apt update && sudo apt -y install caddy

# point a DNS A record (e.g. binonce.example.com) at <SERVER_IP> first, then:
VPS$ echo 'binonce.example.com {
    reverse_proxy localhost:3000
}' | sudo tee /etc/caddy/Caddyfile
VPS$ sudo systemctl reload caddy      # Caddy fetches a Let's Encrypt cert automatically
```

Open `https://binonce.example.com` — done.

## 9. Updating later

```bash
VPS$ cd ~/app && git pull && npm install && npm run build && pm2 restart binonce
```

---

## Notes / gotchas

- **Gas:** the relayer (`0xAb21d5…`) and operator keys must hold testnet gas (WBT on
  Whitechain, SepoliaETH) or payouts fail. Top up before demoing.
- **One run at a time:** the app has an in-process run lock + SSE session store. With
  pm2 keep it to a **single instance** (don't use `pm2 -i max` / cluster mode) or the
  lock and the Safe-signing session break.
- **Streaming:** defense/attack runs stream for 30–90s. Caddy/`reverse_proxy` handles
  SSE fine; no extra buffering config needed (the routes already send `X-Accel-Buffering: no`).
- **Security:** this box holds live private keys. Keep them testnet-only, restrict SSH to
  your key, and don't expose port 3000 directly (only 80/443 via Caddy).
- **Secrets never in git:** `.env*`, keystores, and `~/.config/chainwall-wc.pw` are
  transferred by `scp`, never committed.
