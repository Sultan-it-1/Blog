// The session replayed by the home-page terminal. Commands come from the blog's own tutorials.
// main.js animates it with seek(t); without JavaScript the finished session is shown as-is.
export default {
  title: "ubuntu@vpn-server: ~",
  lines: [
    { cmd: "ssh -i aws-key.pem ubuntu@54.67.153.151" },
    { out: "Welcome to Ubuntu 24.04 LTS" },
    { cmd: "sudo apt install wireguard -y" },
    { out: "Setting up wireguard-tools ..." },
    { cmd: "sudo systemctl enable --now wg-quick@wg0" },
    { cmd: "sudo wg show" },
    { out: "interface: wg0" },
    { out: "  listening port: 51820" },
    { cmd: "sudo ufw status" },
    { out: "Status: active", tone: "ok" },
  ],
};
