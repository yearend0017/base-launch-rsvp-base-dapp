# Base Launch Rsvp

**Field report:** this repo documents a deployed Base dApp used for launch attendance. The observed user path is short: arrive, connect wallet, joining a launch list, inspect the RSVP.

## Evidence collected

| Field | Value |
| --- | --- |
| Base Developer Dashboard | Registered |
| Build ID / Base App ID | `6a03e84a2be96789d34cefba` |
| Builder Wallet | `0x90bb5a7FeaFd06f8771579Ff6d4DdB47a7efE221` |
| Builder Code | `bc_pe34634n` |
| Live Demo | https://base-launch-rsvp.vercel.app |
| GitHub Repository | https://github.com/yearend0017/base-launch-rsvp-base-dapp |
| Network | Base |
| Deployment | Vercel |

## Notes from the field

The app avoids account-email identity assumptions. Public project identity is established by matching the Base App ID, builder wallet, Builder Code, Vercel deployment, and repository.

## Equipment

React app router, wallet hooks, Base network config, Vercel deployment

## Local reproduction

```bash
npm install
npm run dev
```

## Red lines

Do not commit `.env`, private keys, seed phrases, RPC keys, GitHub tokens, or Vercel tokens. Use `.env.example` only for placeholders.

License: MIT
