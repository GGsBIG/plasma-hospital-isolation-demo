# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Brobridge sales and solution staff, presenting Plasma to hospital customers in a meeting room (projected, presenter controls the pace).
- The customer's people (hospital management, IT) reopening the same link afterwards on their own laptop or phone, without a presenter.
- Every demo must work in both situations: readable from across a room, and self-explanatory when read alone.

## Product Purpose
Interactive scenario demos for Plasma, Brobridge's data platform, published under brobridge.com/demos/. Each demo shows a customer the pain they have today and how Plasma removes it, so they understand the direction in one sitting.

The Show Chwan (秀傳醫院) demo: the hospital has four branches whose databases have different schemas, so the head office cannot answer cross-branch questions such as "which nurses does each branch have". The proposed flow: each branch connects to Plasma, uploads system documents (specs, data dictionaries, code tables) to Plasma's AI, builds its own organized data; staff use an AI agent to organize data by asking questions; the organized result is published as a data product; the head office pulls the data products to aggregate across branches.

## Positioning
Plasma connects heterogeneous databases read-only, understands each source's schema from uploaded documents, lets people organize data by asking an AI agent (via MCP), and publishes the result as governed data products others can pull. The demo must show those mechanisms, not generic "integration" claims.

## Operating Context
- Shown in sales meetings, then sent as a link. Linked from the /demos/ hub page.
- Delivered as static files inside a WordPress-hosted folder (hub/build.sh packages the zip).
- Presenter uses keyboard (← → / space) or the on-screen controls; autoplay exists for unattended viewing.

## Capabilities and Constraints
- Stack: Vite + React + TypeScript + Tailwind, built with relative paths (`base: "./"`).
- Isometric node graphics (components/Iso.tsx) and the AI agent chat (components/AgentChat.tsx) are existing demo assets.
- Branch names stay generic (A／B／C／D 分院). Database brands, schema snippets and all numbers (e.g. 812 nurses) are illustrative and must be labeled as examples where they could be read as real.
- Never use 中科院 / NCSIST wording anywhere.
- Must work at desktop presentation widths and on phones (390px).

## Brand Commitments
- Match the Brobridge official site and the /demos/ hub: paper white #ffffff, ink #111111, logo red #b42622 (deep #8f1d1a), sheet #ece9e2, hairlines rgb(17 17 17 / 0.18); square corners; 6px red top rule on the header; system sans (SF Pro / PingFang TC / Microsoft JhengHei); bar buttons with 2px ink border; easing cubic-bezier(0.16, 1, 0.3, 1).
- Brobridge logo links back to the hub (`../#showchwan`).
- Copy is Traditional Chinese (Taiwan), short and plain.

## Evidence on Hand
- No real customer data, testimonials or measured results. All figures are demonstration data.
- Plasma documentation: https://plasma-docs.brobridge.workers.dev/zh-Hant/ (data products, MCP, views, workspaces).

## Product Principles
1. One sitting, one direction: the customer should leave knowing what hurts today and the path Plasma takes, not every feature.
2. Show the mechanism working (documents going in, the agent answering, a data product feeding the head office) rather than stating benefits.
3. Every solution step names the pain it removes.
4. Readable from the back of a meeting room and on a phone, with the same content.
