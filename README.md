# MedBridge Pass

A modern, responsive web platform that connects Singapore patients with hospitals and clinics in Batam, Indonesia for seamless cross-border medical tourism.

**Tagline:** Seamless Cross-Border Patient & Medical Experiences

## What it does

MedBridge Pass orchestrates the full medical tourism journey:

- Patients reach out via WhatsApp, Telegram, or the built-in web chat.
- An AI intake agent (Hermes) extracts requirements and builds a structured medical request.
- Hospital staff review, edit, and approve proposed quotes and itineraries.
- Patients receive a secure itinerary link with cost breakdowns and confirm their booking.
- Staff manage inquiries, quotes, doctors, treatments, logistics, and analytics from a unified dashboard.

## Tech stack

- [TanStack Start](https://tanstack.com/start) – full-stack React framework
- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query) & [TanStack Router](https://tanstack.com/router)
- [Lovable Cloud](https://lovable.dev) (PostgreSQL, Auth, Realtime)
- AI Gateway for intent extraction and recommendation orchestration

## Getting started locally

```sh
git clone <repository-url>
cd medbridge-pass
npm i
npm run dev
```

Copy `.env.example` to `.env` and fill in your own Supabase and messaging provider credentials.

## Deployment

The project is developed in [Lovable](https://lovable.dev) and synced to GitHub. Changes pushed to the connected GitHub repository automatically sync back to the Lovable editor.

## Important notes

- Never commit `.env` files to version control.
- The app uses Row-Level Security (RLS) on all database tables.
- Messaging webhooks verify signatures before processing inbound events.
