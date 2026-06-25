import { PrismaClient, LeadStatus, QueueStatus } from "@prisma/client";

const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number, hour = 10, minute = 0): Date {
  const d = new Date("2026-06-18T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function randId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

// Scoring mirrors computeLeadScore in leadQualification.ts — must stay in sync.
function computeScore(s: {
  decisionMaker: boolean;
  activeProjects: boolean;
  purchaseTimelineDays: number | null;
  openToAlternatives: boolean;
  requestedQuote: boolean;
  followUpRequested: boolean;
}): number {
  let score = 0;
  if (s.decisionMaker) score += 15;
  if (s.activeProjects) score += 25;
  if (s.purchaseTimelineDays !== null && s.purchaseTimelineDays <= 60) score += 25;
  if (s.openToAlternatives) score += 10;
  if (s.requestedQuote) score += 15;
  if (s.followUpRequested) score += 10;
  return score;
}

function temperature(score: number, s: { activeProjects: boolean; purchaseTimelineDays: number | null; requestedQuote: boolean }): "hot" | "warm" | "cold" {
  if (s.activeProjects && s.purchaseTimelineDays !== null && s.purchaseTimelineDays <= 60 && s.requestedQuote) return "hot";
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

function intentLevel(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function nextAction(temp: "hot" | "warm" | "cold", requestedQuote: boolean): string {
  if (temp === "hot") return requestedQuote ? "Send Quote" : "Schedule Sales Call";
  if (temp === "warm") return "Schedule Sales Call";
  return "Add To Nurture Campaign";
}

// ── lead definitions ─────────────────────────────────────────────────────────

interface LeadDef {
  name: string;
  phoneNumber: string;
  company: string;
  industry: string;
  callDaysAgo: number[];          // one entry per call, most recent last
  signals: {
    decisionMaker: boolean;
    activeProjects: boolean;
    projectStage: string;
    materialsNeeded: string[];
    purchaseTimelineDays: number | null;
    currentSupplier: string;
    openToAlternatives: boolean;
    requestedQuote: boolean;
    followUpRequested: boolean;
    objections: string[];
    painPoints: string[];
    summary: string;
    followupNeeded: boolean;
    recommendedFollowupMessage: string;
    transcript: string;
  };
}

const leads: LeadDef[] = [
  // ── HOT LEADS ──────────────────────────────────────────────────────────────
  {
    name: "Mohammed Al-Thani",
    phoneNumber: "+97433156781",
    company: "Al-Thani Construction & Development",
    industry: "Construction",
    callDaysAgo: [28, 21, 14],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Foundation and superstructure",
      materialsNeeded: ["Steel rebar", "Ready-mix concrete", "Structural steel"],
      purchaseTimelineDays: 14,
      currentSupplier: "Qatar Steel",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Current supplier relationship is long-standing", "Need to verify quality certifications"],
      painPoints: ["Delayed deliveries from current supplier", "Price increases in last quarter", "Limited stock availability"],
      summary: "Mohammed is the procurement director at Al-Thani Construction overseeing a large residential tower project in Lusail. He expressed strong interest in switching suppliers for steel rebar after recent delivery delays. He explicitly requested a formal quote and asked to be called back by Thursday.",
      followupNeeded: true,
      recommendedFollowupMessage: "Good morning Mohammed, following up on your interest in our steel rebar supply for the Lusail tower project. I have prepared a competitive quote addressing the delivery timeline concerns you mentioned. Shall we schedule a 30-minute call to walk through the pricing and logistics?",
      transcript: `AI Agent: As-salamu alaykum, am I speaking with Mohammed Al-Thani from Al-Thani Construction?

Mohammed: Wa alaykum as-salam, yes this is Mohammed.

AI Agent: Wonderful. I'm calling from Gulf Materials Supply. We supply high-grade construction materials across Qatar, including steel rebar, ready-mix concrete and structural steel. I understand you have an active project in Lusail. Is this a good time to talk?

Mohammed: Yes, actually your timing is good. We are having serious issues with our current supplier — Qatar Steel has been delaying shipments. The tower project is behind schedule because of it.

AI Agent: I'm sorry to hear that. Delivery reliability is critical at the foundation and superstructure stage. What quantities of rebar are you looking at over the next two months?

Mohammed: We need approximately 800 metric tons of Grade 500 rebar, and about 2,000 cubic metres of ready-mix over six weeks. We have a hard deadline from the developer.

AI Agent: We can definitely accommodate those volumes with guaranteed 48-hour delivery windows. Our Grade 500 rebar is certified to BS 4449. Would you like me to prepare a formal quote with delivery schedule?

Mohammed: Yes, please send a quote. I have authority to approve up to QAR 5 million directly. Can you call me back on Thursday to discuss the numbers?

AI Agent: Absolutely. I will prepare the quote and call you Thursday morning. Just to confirm — you're looking at delivery starting within two weeks?

Mohammed: Correct. Two weeks maximum or we risk a penalty clause with the developer.

AI Agent: Understood. We will make that work. Thank you, Mohammed. I'll follow up on Thursday.

Mohammed: Thank you. Ma'a as-salama.`,
    },
  },
  {
    name: "Khalid Al-Mannai",
    phoneNumber: "+97455234891",
    company: "MIDMAC Contracting",
    industry: "Construction",
    callDaysAgo: [25, 18, 7],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Interior fit-out and finishing",
      materialsNeeded: ["Marble tiles", "Ceramic tiles", "Grouting materials", "Waterproofing membrane"],
      purchaseTimelineDays: 21,
      currentSupplier: "Al-Fardan Tiles",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Already placed partial order with existing supplier", "Needs board approval for orders above QAR 2M"],
      painPoints: ["Quality inconsistency in marble batches", "Shortage of specific tile patterns", "Long lead times for Italian marble"],
      summary: "Khalid is senior procurement manager at MIDMAC handling fit-out for a luxury villa complex in The Pearl. He's actively looking for a secondary tile and marble supplier due to quality inconsistencies. He requested pricing for 15,000 sqm of Italian marble and confirmed budget approval authority.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Khalid, as discussed, I'm sending over our catalogue for the Calacatta and Statuario marble collections along with pricing for 15,000 sqm. We can arrange a showroom visit at your convenience. When works best this week?",
      transcript: `AI Agent: Good morning, may I speak with Khalid Al-Mannai?

Khalid: Speaking.

AI Agent: Good morning Khalid. This is Gulf Materials Supply. We specialize in premium tiles and marble for luxury residential and commercial projects. I understand MIDMAC is currently working on the Pearl villa complex — is that right?

Khalid: Yes, we are in fit-out phase. What are you offering?

AI Agent: We import Italian Calacatta and Statuario marble directly, with consistent batch quality guaranteed. Our lead time is 18 days versus the typical 45-day lead time from other importers. I saw some industry chatter about quality issues in the market — are you facing any supply challenges?

Khalid: Honestly yes. Our current supplier sent three batches with visible colour variation. The client rejected one full shipment. It's a nightmare.

AI Agent: That's a significant problem on a luxury project. We have a batch consistency guarantee — any variation beyond delta E 1.5 and we replace at our cost. How much area are you still needing to cover?

Khalid: We still need around 15,000 square metres across 48 villas. Mix of floor and wall applications.

AI Agent: I can get you a competitive quote today for that volume. Would you want to visit our showroom to view samples first, or shall I send catalogue specs and pricing?

Khalid: Send me pricing first, then we can talk about a showroom visit. And yes, please call me — actually call me next week Monday after I review.

AI Agent: Excellent. I'll have everything ready by end of day. Thank you, Khalid.`,
    },
  },
  {
    name: "Hamad Al-Misnad",
    phoneNumber: "+97450871234",
    company: "Doha Development Group",
    industry: "Real Estate Development",
    callDaysAgo: [22, 10],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Groundworks and substructure",
      materialsNeeded: ["Concrete blocks", "Sand", "Aggregate", "Waterproofing membrane"],
      purchaseTimelineDays: 30,
      currentSupplier: "Al-Khulaifi Materials",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Price sensitivity — working within tight budget", "Requires local certification for municipality approval"],
      painPoints: ["Current supplier can't meet volume requirements", "Municipality requires specific grade certifications", "Project timeline is tight"],
      summary: "Hamad is the project director at Doha Development Group for a mixed-use development in Al-Wakrah. His current supplier cannot meet the volume requirements for concrete blocks. He is fully authorized to make purchasing decisions and requested a formal supply agreement proposal.",
      followupNeeded: true,
      recommendedFollowupMessage: "Dear Hamad, as discussed, please find attached our supply agreement proposal for 500,000 concrete blocks Grade 7 with monthly delivery schedule. All products carry Qatar Municipality certification. Looking forward to your review.",
      transcript: `AI Agent: Marhaba, is this Hamad Al-Misnad from Doha Development Group?

Hamad: Ahlan, yes that's me.

AI Agent: Good afternoon Hamad. Gulf Materials Supply here. We're reaching out to construction developers in Al-Wakrah — we understand there's significant activity in that corridor. Are you currently running any projects there?

Hamad: Yes, we have a large mixed-use plot — commercial ground floor with three residential towers above. Groundworks are underway right now.

AI Agent: Perfect timing then. We supply concrete blocks, aggregate and waterproofing solutions with all Qatar Municipality approvals. What volumes are you looking at for substructure work?

Hamad: We need around 500,000 concrete blocks — Grade 7 — over the next 90 days. Our current supplier told us they can only fulfil 60% of that. It's a problem.

AI Agent: We can cover that shortfall completely. We have 800,000 blocks in stock right now, all QM-certified. Can I send you a supply agreement with monthly delivery tranches?

Hamad: Yes, please. What about pricing?

AI Agent: I'll include a full price breakdown. For that volume we can offer a 12% discount versus standard market rate. I'm authorised to sign off on supply contracts — are you the decision maker on procurement for this project?

Hamad: Yes, I handle all procurement. Send me the proposal and call me in two days to follow up.

AI Agent: Will do, Hamad. Thank you for your time.`,
    },
  },
  {
    name: "Deepak Mehta",
    phoneNumber: "+97431456789",
    company: "Redco International",
    industry: "Construction",
    callDaysAgo: [20, 12, 5],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "MEP rough-in and structural completion",
      materialsNeeded: ["HDPE pipes", "Conduit", "Insulation boards", "Structural steel sections"],
      purchaseTimelineDays: 28,
      currentSupplier: "Gulf Pipes Trading",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Current supplier has penalty clause in contract", "Technical specs need engineering sign-off"],
      painPoints: ["HDPE pipe shortage in local market", "Prices have increased 18% this year", "Long approval process for imported materials"],
      summary: "Deepak is procurement head at Redco managing an airport expansion subcontract. He needs large volumes of HDPE pipes and conduit urgently. He confirmed he is the sole procurement decision maker and explicitly requested a quote with technical data sheets.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Deepak, attached is our quote for 8,000 metres of DN200 HDPE pipe and 45,000 metres of conduit along with all technical data sheets and compliance certificates. Pricing is valid for 14 days. Please call any time to discuss.",
      transcript: `AI Agent: Good morning, may I speak with Deepak Mehta?

Deepak: Yes, Deepak here.

AI Agent: Good morning Deepak. This is Gulf Materials Supply. We supply HDPE pipes, conduit and insulation for large infrastructure projects. We noticed Redco is active on the airport expansion — are you involved in that?

Deepak: Yes I'm heading procurement for the MEP subcontract on that project.

AI Agent: Excellent. HDPE availability is very tight in the market right now. Are you facing any supply issues on pipes?

Deepak: Exactly that — I've been trying to source DN200 HDPE for three weeks. Every supplier is out of stock or quoting 10-week lead times. We need it in four weeks maximum.

AI Agent: We have 12,000 metres of DN200 in our Doha warehouse available immediately. What quantity do you need?

Deepak: We need 8,000 metres of DN200 and also around 45,000 metres of various conduit sizes. If you can supply both, that's worth doing business.

AI Agent: We can supply all of that from local stock. I'll have a quote with technical data sheets and compliance certificates ready today. Are you the one who approves these purchases?

Deepak: Yes, I have full authority. Send me the quote. Include the TDS and any ASTM compliance certificates.

AI Agent: Will do. I'll send it by 2pm and can call you tomorrow morning to discuss.

Deepak: Perfect, thanks.`,
    },
  },
  {
    name: "Jassim Al-Naimi",
    phoneNumber: "+97466912347",
    company: "National Contracting Company (NCC)",
    industry: "Construction",
    callDaysAgo: [27, 19, 9],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "External works and infrastructure",
      materialsNeeded: ["Asphalt", "Kerb stones", "Paving blocks", "Drainage pipes"],
      purchaseTimelineDays: 45,
      currentSupplier: "Doha Paving Co.",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: false,
      objections: ["Competitive pricing required — government contract has fixed budget"],
      painPoints: ["Current supplier slow on delivery for paving blocks", "Quality issues on previous kerb stone batch"],
      summary: "Jassim is the operations manager at NCC overseeing road infrastructure works in a government district. He is looking for competitive pricing on paving materials and is authorized to switch suppliers. He requested a quotation for asphalt and paving blocks.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hello Jassim, following our conversation — please find attached our competitive quote for paving blocks and kerb stones for the district infrastructure project. We can guarantee delivery within 72 hours of order confirmation. Let me know if you need any adjustments.",
      transcript: `AI Agent: Good afternoon. May I speak with Jassim Al-Naimi?

Jassim: Yes, this is Jassim.

AI Agent: Good afternoon Jassim. Calling from Gulf Materials Supply. We supply road and infrastructure materials — paving blocks, kerb stones, drainage — across Qatar. I understand NCC has ongoing external works contracts. Is that right?

Jassim: Yes, we are doing external infrastructure for a government district project. Road paving and drainage.

AI Agent: Are you satisfied with your current supply arrangements, or are there any challenges?

Jassim: Honestly, paving blocks have been an issue. Quality on the last delivery was inconsistent and our client flagged it.

AI Agent: We manufacture paving blocks in-house in Qatar to BS EN 1338 standard with third-party batch testing. What volumes are you looking for?

Jassim: For paving blocks, roughly 200,000 pieces over the next six weeks. Also kerb stones — about 8,000 linear metres. And the asphalt for top coat, maybe 2,500 tonnes.

AI Agent: We can handle all of that. For that volume we can offer priority scheduling with 48-hour delivery. Would you like a formal quote?

Jassim: Yes, send me a quote. Include unit rates and VAT breakdown. Our finance team needs that format.

AI Agent: Perfect. I'll send that today. What email shall I use?

Jassim: procurement@nccqatar.com

AI Agent: Got it. Thank you, Jassim.`,
    },
  },
  {
    name: "Vikram Singh",
    phoneNumber: "+97453678912",
    company: "Samsung C&T Qatar",
    industry: "Construction",
    callDaysAgo: [29, 22, 15, 8],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Superstructure and high-rise façade",
      materialsNeeded: ["Structural steel", "High-strength bolts", "Curtain wall aluminum", "Sealants"],
      purchaseTimelineDays: 30,
      currentSupplier: "Hyundai Steel (imported)",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Korean HQ has preferred supplier agreements", "Local sourcing requires technical committee approval"],
      painPoints: ["Import lead times extended due to shipping delays", "Currency fluctuation increasing material costs", "Need local backup supplier for critical items"],
      summary: "Vikram manages local procurement for Samsung C&T's major high-rise project in West Bay. He's actively looking for a local structural steel supplier as a backup to reduce dependency on lengthy import cycles. He is approved to sign local supply contracts and requested a quote with material certs.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Vikram, as requested — attached is our structural steel quote including mill certificates and load-bearing specs for Grade 50 sections. All stock is available locally for immediate delivery. Let's schedule a technical review meeting this week.",
      transcript: `AI Agent: Good morning, is this Vikram Singh?

Vikram: Yes, speaking.

AI Agent: Good morning Vikram. Gulf Materials Supply here. We're a local structural steel and building materials distributor. I know Samsung C&T is working on the West Bay tower — I wanted to introduce our local supply capability. Do you have a moment?

Vikram: Go ahead, yes.

AI Agent: We hold significant local stock of structural steel — I beams, H sections, hollow sections — all with mill certificates. Local sourcing can dramatically cut your procurement lead time versus importing from Korea. Are you facing any lead time pressure right now?

Vikram: Actually yes. Shipping from Korea is currently 14 to 16 weeks due to port congestion. We have a gap in about six weeks for column sections and we're nervous.

AI Agent: We have Grade 50 columns and H-sections in stock now — we can fill urgent requirements within 72 hours. What sections do you need?

Vikram: 200x200 and 250x250 H-sections mainly. Probably 150 tonnes in the first order. If quality is right, we would make you a regular secondary supplier.

AI Agent: That we can do. I'll send you a quote with full material traceability certs. Would a technical meeting help — our structural engineer can review your drawings with your team?

Vikram: Yes, let's do that. Call me next week to schedule. And send the quote first so I can show my manager.

AI Agent: Will do. Thank you, Vikram.`,
    },
  },
  {
    name: "Ahmed Al-Emadi",
    phoneNumber: "+97435789023",
    company: "UrbaCon Trading & Contracting",
    industry: "Construction",
    callDaysAgo: [24, 16, 6],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Infrastructure and landscape",
      materialsNeeded: ["Irrigation pipes", "Landscape boulders", "Concrete kerbs", "Street lighting poles"],
      purchaseTimelineDays: 21,
      currentSupplier: "Al-Ansari Trading",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Prequalification process required for new suppliers"],
      painPoints: ["Irrigation pipes often out of stock", "Inconsistent quality on landscape materials", "Poor after-sales support from current supplier"],
      summary: "Ahmed is procurement manager for UrbaCon's landscape and infrastructure division working on a new residential community in Msheireb. He needs irrigation pipes and landscape materials urgently and is open to switching suppliers. He explicitly requested pricing and asked for a callback.",
      followupNeeded: true,
      recommendedFollowupMessage: "Good morning Ahmed, attached is our pricing for HDPE irrigation pipes, concrete kerbs and landscape boulders for the Msheireb community project. We can complete prequalification paperwork within 24 hours. Looking forward to your call.",
      transcript: `AI Agent: Marhaba, may I speak with Ahmed Al-Emadi?

Ahmed: Ahlan, this is Ahmed.

AI Agent: Good morning Ahmed. Gulf Materials Supply here. We supply landscape and infrastructure materials across Qatar — irrigation pipes, kerbs, poles, boulders. I saw UrbaCon is working on Msheireb — is that right?

Ahmed: Yes, we have the landscape package for phase two. It's a big project.

AI Agent: Are you satisfied with your current materials supply, or is there room to improve?

Ahmed: There's always room. Actually, our irrigation pipe supplier let us down last month — we had a site shutdown for four days because pipes didn't arrive.

AI Agent: A four-day shutdown is very costly. We hold 30,000 metres of HDPE irrigation pipe in Doha warehouse for immediate dispatch. What sizes and volumes do you need?

Ahmed: Mostly 63mm and 110mm HDPE. Around 15,000 metres of each. And we need class C concrete kerbs — about 5,000 linear metres.

AI Agent: We can supply all of that. Do you want me to send you pricing today? We can also expedite your prequalification with UrbaCon's vendor process.

Ahmed: Yes, send pricing. And call me back day after tomorrow — I want to present this to my project director.

AI Agent: Excellent. I'll have everything sent within the hour. Thank you, Ahmed.`,
    },
  },
  {
    name: "Nasser Al-Sulaiti",
    phoneNumber: "+97456023489",
    company: "Al-Jaber Engineering",
    industry: "Engineering & Contracting",
    callDaysAgo: [26, 13, 4],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "HVAC and mechanical installation",
      materialsNeeded: ["HVAC ducting", "Insulation materials", "Copper pipes", "Mechanical fasteners"],
      purchaseTimelineDays: 35,
      currentSupplier: "Emirates Technical Supply",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Existing framework agreement with UAE supplier", "Technical director needs to approve new supplier"],
      painPoints: ["UAE supplier import costs high due to freight", "HVAC ducting not always available in local market", "Delivery from UAE takes 5-7 days minimum"],
      summary: "Nasser is the procurement supervisor at Al-Jaber overseeing MEP packages on a healthcare project. He is actively looking for local HVAC materials to reduce lead times and costs. He requested a quote and asked to be called back after internal approval.",
      followupNeeded: true,
      recommendedFollowupMessage: "Dear Nasser, please find attached our competitive quotation for HVAC rectangular ducting, insulation and copper pipe for the healthcare project. All items are locally stocked — delivery within 24 hours. Please share with your technical director and let me know if you need samples.",
      transcript: `AI Agent: Good afternoon. May I speak with Nasser Al-Sulaiti from Al-Jaber Engineering?

Nasser: This is Nasser. Who is calling?

AI Agent: Good afternoon Nasser. Gulf Materials Supply. We specialise in MEP and HVAC materials with local Doha stock. I understand Al-Jaber has ongoing MEP work on a healthcare facility — I wanted to introduce our capability. Is now a good time?

Nasser: Yes, briefly. We are in mechanical installation phase.

AI Agent: Are you sourcing HVAC ducting and insulation locally or importing?

Nasser: We import most from UAE. The freight is expensive and lead time is a week minimum. It's affecting our programme sometimes.

AI Agent: We carry rectangular spiral ducting, fibreglass insulation, and copper pipe in full range of sizes — all in Doha. Delivery next day guaranteed. How much ducting are you looking at for this project?

Nasser: We need about 4,500 square metres of rectangular ducting in mixed sizes, and around 2,000 metres of copper pipe sizes 15 to 54mm.

AI Agent: We have all of that. Can I prepare a full quote with technical specs and delivery schedule?

Nasser: Yes. Send it to me. I'll show my technical director and call you back at end of week.

AI Agent: Perfect. Thank you, Nasser. I'll have it ready by this afternoon.`,
    },
  },
  {
    name: "Eduardo Dela Cruz",
    phoneNumber: "+97458234567",
    company: "Bechtel Qatar",
    industry: "Engineering & Construction",
    callDaysAgo: [23, 11, 3],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Civil works and utilities installation",
      materialsNeeded: ["Concrete pipes", "Ductile iron fittings", "Geotextile fabric", "Backfill aggregate"],
      purchaseTimelineDays: 45,
      currentSupplier: "Various international suppliers",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Bechtel's global procurement standards require specific certifications", "Multiple stakeholder approvals needed"],
      painPoints: ["Complex procurement process slows projects", "Inconsistent availability of geotechnical materials", "Budget pressure to source locally"],
      summary: "Eduardo is local procurement coordinator at Bechtel working on a large infrastructure project. He is motivated to source locally to reduce costs and lead times. He has approval authority for local purchases under USD 500K and explicitly requested a formal quotation.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Eduardo, following our call — attached is our formal quotation for concrete pipes, DI fittings and geotextile fabric. All items carry relevant ASTM and BS certifications. Please let me know if you need additional documentation for Bechtel's vendor onboarding.",
      transcript: `AI Agent: Good afternoon. Is this Eduardo Dela Cruz at Bechtel Qatar?

Eduardo: Yes, this is Eddie. How can I help?

AI Agent: Hi Eddie. Gulf Materials Supply here. We supply civil materials — concrete pipes, ductile iron, geotextile, aggregate — for large infrastructure projects in Qatar. We know Bechtel is doing significant civil works currently. I wanted to introduce local supply options. Do you have a couple of minutes?

Eduardo: Sure. We are always looking at local sourcing to reduce costs.

AI Agent: Great. What civil materials are you currently importing versus sourcing locally?

Eduardo: We import most concrete pipes and DI fittings. Local aggregate and sand we already buy locally. The problem is our pipe specs are quite strict — ASTM D3034 and EN 545.

AI Agent: We carry pipes to exactly those standards. All certified and traceable. Locally stocked. For the DI fittings — we carry K9 and K12 classes. What volumes are you looking at?

Eduardo: Roughly 3,000 metres of various concrete pipe diameters and around 500 DI fittings, mixed types. If quality and certs check out, this could be the start of something bigger.

AI Agent: I'll prepare a formal quotation with all certifications attached. Are you the right person to submit this to?

Eduardo: Yes, I handle local procurement approvals up to $500K. Send me the quote. I'll review and call you next week.

AI Agent: Perfect. Thank you very much, Eddie.`,
    },
  },
  {
    name: "Rashid Al-Khater",
    phoneNumber: "+97460134578",
    company: "Qatar Foundation Contractors",
    industry: "Construction",
    callDaysAgo: [15, 5],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "High-spec interior and external cladding",
      materialsNeeded: ["Aluminium composite panels", "Glass panels", "Cladding fixings", "Structural silicone"],
      purchaseTimelineDays: 20,
      currentSupplier: "Alucobond Middle East",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Architect specification mentions Alucobond by name"],
      painPoints: ["Alucobond delivery backlogged by 12 weeks", "Client pushing to finish external works", "Approved alternatives hard to get fast"],
      summary: "Rashid is senior project manager for a prestigious Qatar Foundation building. The architect-specified cladding supplier is 12 weeks backordered. He has authority to approve substitutions and needs an alternative quote urgently.",
      followupNeeded: true,
      recommendedFollowupMessage: "Good morning Rashid, I've attached a full product comparison sheet for our ALPOLIC ACP panels against the Alucobond specification along with our quote for the required quantity. We can submit an architect-approval data pack to fast-track the substitution. Shall I arrange that?",
      transcript: `AI Agent: Good morning. May I speak with Rashid Al-Khater?

Rashid: Yes, this is Rashid.

AI Agent: Good morning Rashid. Gulf Materials Supply here. We supply ACP cladding systems and glass panels for high-specification projects. I understand Qatar Foundation Contractors is working on an important education facility — is that correct?

Rashid: Yes. We have the external works package. What is this regarding?

AI Agent: We've heard there are market shortages on Alucobond panels right now. Are you experiencing any supply issues?

Rashid: How did you know? Yes, our supplier just told us 12 weeks backorder. The client is pushing us for handover in 10 weeks. This is a crisis.

AI Agent: We carry ALPOLIC ACP panels which meet the same EN 13501-B fire classification. We can supply the full requirement from stock within 5 days. What's the total area you need?

Rashid: Around 8,500 square metres. Mix of silver and custom colours. The problem is the architect spec says Alucobond.

AI Agent: We can prepare a full technical equivalency pack for architect approval — most approvals come through in 48 hours for like-for-like substitutions. Shall I prepare a quote and the approval documentation?

Rashid: Please yes. This could save the project. Send it urgently and call me back tomorrow.

AI Agent: I'll have everything to you within two hours. Thank you, Rashid.`,
    },
  },

  // ── WARM LEADS ─────────────────────────────────────────────────────────────
  {
    name: "Abdullah Al-Kuwari",
    phoneNumber: "+97433891234",
    company: "Gulf Structures Co.",
    industry: "Structural Engineering",
    callDaysAgo: [26, 17],
    signals: {
      decisionMaker: false,
      activeProjects: true,
      projectStage: "Design and early procurement",
      materialsNeeded: ["Precast concrete panels", "Post-tensioning cables", "Formwork"],
      purchaseTimelineDays: 75,
      currentSupplier: "Gulf Precast",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Not the decision maker — needs director approval", "Currently in design phase, not ready to commit"],
      painPoints: ["Precast panel quality has been inconsistent across batches"],
      summary: "Abdullah is a structural engineer at Gulf Structures Co. working on early procurement planning for a bridge project. He is interested in precast solutions but needs to escalate to his director. He asked to be called back in three weeks when the design is finalised.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Abdullah, I'm following up as we discussed. Attached is our precast panel capability brochure. When your design is ready, we'd be happy to do a technical presentation to your director. Please let me know when would be a good time.",
      transcript: `AI Agent: Good morning. May I speak with Abdullah Al-Kuwari?

Abdullah: Yes, this is Abdullah.

AI Agent: Morning Abdullah. Gulf Materials Supply here. We supply precast concrete panels for bridges and large structures. I understand Gulf Structures has upcoming bridge work — is that right?

Abdullah: We are in the design phase still. Not ordered anything yet.

AI Agent: Understood. We like to get involved early so we can support design with technical specs. What type of precast are you considering — standard beams or custom panels?

Abdullah: Custom panels — it's a segmental bridge. We need very precise tolerances. Quality is everything.

AI Agent: We specialize in exactly that — BS EN 13369 certified with independent batch testing. Would you like to discuss specs? Are you the procurement decision maker?

Abdullah: No, that would be my director. I'm the structural lead. I can recommend suppliers though.

AI Agent: Perfect — your recommendation is important. Shall I prepare technical documentation for you to present to the director?

Abdullah: Yes, that would help. But call me back in three weeks — design should be frozen by then.

AI Agent: Will do. Thanks, Abdullah.`,
    },
  },
  {
    name: "Sunil Sharma",
    phoneNumber: "+97456134589",
    company: "Lusail Construction",
    industry: "Construction",
    callDaysAgo: [24, 14, 6],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Fit-out and MEP rough-in",
      materialsNeeded: ["PVC conduit", "Cable trays", "Junction boxes"],
      purchaseTimelineDays: 80,
      currentSupplier: "Legrand Qatar",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Happy with current supplier pricing", "No urgency to change"],
      painPoints: ["Delivery times occasionally slow in peak season"],
      summary: "Sunil is procurement manager at Lusail Construction, satisfied with his current electrical materials supplier but open to being on the approved list as a backup. He asked to be contacted in about three months when they start a new project phase.",
      followupNeeded: false,
      recommendedFollowupMessage: "Hi Sunil, hope things are going well on the Lusail project. As discussed, I wanted to stay in touch for when your next phase begins. Would you be open to a brief meeting to walk through our product range as a potential backup supplier?",
      transcript: `AI Agent: Good afternoon. Is this Sunil Sharma at Lusail Construction?

Sunil: Yes, speaking. Who is this?

AI Agent: Good afternoon Sunil. Gulf Materials Supply here. We supply electrical conduit and cable management systems. I wanted to see if you have any current requirements or upcoming projects we could help with.

Sunil: We are mid-project right now but fairly well covered for materials. We use Legrand for most electrical stuff and they've been good.

AI Agent: That's great. Are there ever times when you face stock shortages or extended delivery times?

Sunil: Sometimes in peak season the delivery slows down a bit. But nothing critical.

AI Agent: Understood. We'd be happy to be on your approved supplier list as a backup. Our stock is local and we can ship same day. Is there a new project phase coming up where you'd need to start planning?

Sunil: Actually yes, phase three starts in about three months. That might be a better time to talk.

AI Agent: Perfect. Shall I call you back in about twelve weeks?

Sunil: Yes, do that. Thank you.`,
    },
  },
  {
    name: "Ibrahim Al-Fardan",
    phoneNumber: "+97436789012",
    company: "Pearl Island Builders",
    industry: "Luxury Real Estate",
    callDaysAgo: [21, 12],
    signals: {
      decisionMaker: false,
      activeProjects: true,
      projectStage: "Villa finishing and landscaping",
      materialsNeeded: ["Natural stone", "Terracotta tiles", "Timber cladding"],
      purchaseTimelineDays: 60,
      currentSupplier: "Al-Fardan Interior (family business)",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Company sourcing from affiliated supplier", "Decision requires owner approval"],
      painPoints: ["Current supplier range limited for high-end finishes"],
      summary: "Ibrahim works at Pearl Island Builders managing villa finishing. He is interested in premium natural stone but procurement goes through the owner's affiliated business. He suggested a face-to-face meeting with the owner for a future project.",
      followupNeeded: true,
      recommendedFollowupMessage: "Dear Ibrahim, thank you for our conversation. I'd love to arrange a showroom visit for you and the owner to view our Italian stone and premium tile collection. Which day next week works best?",
      transcript: `AI Agent: Good morning. Is this Ibrahim Al-Fardan?

Ibrahim: Yes, good morning.

AI Agent: Good morning Ibrahim. Gulf Materials Supply here. We import premium natural stone, marble and terracotta for luxury villa projects. Pearl Island Builders — I understand you do high-end villas at The Pearl?

Ibrahim: Yes, we do luxury residential there. What are you offering exactly?

AI Agent: We represent Italian quarries directly — Ceppo di Gré, Pietra di Luserna, Travertino Romano — materials you don't easily find locally. For a luxury project, these make a real design statement.

Ibrahim: The specification on our current project is already locked. But I like what you're describing for future projects.

AI Agent: Who usually makes the final material selection for your projects?

Ibrahim: The owner, Mr. Al-Fardan. He's very hands-on. Procurement goes through the affiliated supply company though.

AI Agent: Understood. Would it be worth arranging a showroom visit for you and Mr. Al-Fardan to see the materials in person? No obligation.

Ibrahim: That could be interesting. Let me speak with him. Call me next week and I'll tell you if he's interested.

AI Agent: Perfect. Looking forward to it, Ibrahim.`,
    },
  },
  {
    name: "Jose Santos",
    phoneNumber: "+97457890123",
    company: "Arabtec Qatar",
    industry: "Construction",
    callDaysAgo: [19, 8],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Structural frame completion",
      materialsNeeded: ["Formwork systems", "Scaffolding", "Shoring equipment"],
      purchaseTimelineDays: 90,
      currentSupplier: "PERI Qatar",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["PERI has long-term lease agreement", "Rental model preferred over purchase"],
      painPoints: ["PERI equipment utilization costs high on longer programmes", "Need more shoring equipment but PERI lead time is 8 weeks"],
      summary: "Jose is equipment and temporary works manager at Arabtec. He is open to supplementing PERI rentals with purchases for high-utilization items. He asked to be contacted in two months when the next high-rise project starts.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Jose, as discussed — I've attached a comparison of rental vs purchase cost analysis for 5,000 sqm of slab formwork over an 18-month programme. The purchase option shows significant savings. Let me know if you'd like to meet to discuss.",
      transcript: `AI Agent: Good afternoon. May I speak with Jose Santos at Arabtec?

Jose: Yes, this is Jose.

AI Agent: Afternoon Jose. Gulf Materials Supply here. We supply formwork systems and shoring equipment — both rental and purchase. I wanted to explore if Arabtec has any upcoming requirements.

Jose: We use PERI for most of our formwork. We have a framework agreement with them.

AI Agent: Understood. Are there situations where their availability or pricing creates challenges?

Jose: Actually yes. On long programmes their cumulative rental cost is very high. And right now they're 8 weeks out on some shoring equipment we need.

AI Agent: We have own-brand European shoring available locally — technically equivalent to PERI Multiprop. We could supply on a supplementary basis. Would that interest you?

Jose: It might. But right now we're winding down this project. New high-rise project is starting in about two months. That might be the right time.

AI Agent: Should I call back in about eight weeks?

Jose: Yes, do that. And maybe send me specs and pricing anyway so I can look through them.

AI Agent: Will do. Thank you, Jose.`,
    },
  },
  {
    name: "Saad Al-Jufairi",
    phoneNumber: "+97461890234",
    company: "Qatar Building Materials LLC",
    industry: "Construction Materials Trading",
    callDaysAgo: [17, 9],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Ongoing supply operations",
      materialsNeeded: ["Cement", "Aggregate", "Sand"],
      purchaseTimelineDays: 50,
      currentSupplier: "Qatar National Cement",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Volume discounts from current supplier are hard to beat", "Switching supplier creates administrative burden"],
      painPoints: ["Cement price has increased 3 times this year", "Some grade specifications not available locally"],
      summary: "Saad runs a small construction materials trading company and is interested in becoming a reseller for our bulk materials. He is price-sensitive but open to partnership discussions. He asked for a call next week to discuss reseller terms.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hello Saad, as discussed — I'm attaching our reseller pricing sheet for cement and aggregate. We offer a 14% margin for resellers with monthly volume commitments. Let's connect this week to explore the partnership structure.",
      transcript: `AI Agent: Good morning. May I speak with Saad Al-Jufairi?

Saad: Speaking.

AI Agent: Good morning Saad. Gulf Materials Supply here. We distribute bulk construction materials — cement, aggregate, sand — and we're looking to expand our reseller network in Qatar. I understand Qatar Building Materials is a local trading company?

Saad: Yes, we resell to small contractors mainly. What's your angle?

AI Agent: We can offer you better margin than you're getting from your current supplier if you commit to monthly volumes. We also have some specialty cement grades not widely available — OPC 53, low-alkali, sulfate resistant.

Saad: That's interesting. The sulfate-resistant grade is hard to get and contractors ask for it regularly. What kind of margin are you offering?

AI Agent: Typically 14% for resellers at our minimum volume tiers. But let's have a proper call to go through the numbers — are you the owner or manager?

Saad: I'm the owner. Call me next week Monday. Send me something to look at first.

AI Agent: Perfect. I'll send you our reseller pack today. Thank you, Saad.`,
    },
  },
  {
    name: "Rajesh Patel",
    phoneNumber: "+97452901234",
    company: "Al-Balagh Trading & Contracting",
    industry: "Construction",
    callDaysAgo: [22, 11, 3],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Finishing and MEP completion",
      materialsNeeded: ["Paint", "Flooring adhesive", "Wall putty", "Grout"],
      purchaseTimelineDays: 55,
      currentSupplier: "Jotun Qatar",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["Current paint supplier has loyalty programme", "Switching requires re-approving colour standards"],
      painPoints: ["Delays in colour matching for custom shades", "Paint quality variance between batches"],
      summary: "Rajesh manages finishing materials procurement at Al-Balagh. He is somewhat dissatisfied with colour matching quality but reluctant to switch given loyalty programme. He didn't ask for a callback but was open to seeing samples.",
      followupNeeded: false,
      recommendedFollowupMessage: "Hi Rajesh, we'd like to send you sample cards for our premium paint range with guaranteed colour consistency. No commitment — just to show you what we can offer. Would it be okay to drop them at your site office?",
      transcript: `AI Agent: Good afternoon. Is this Rajesh Patel?

Rajesh: Yes. What is this about?

AI Agent: Good afternoon. Gulf Materials Supply here. We supply finishing materials — paint, flooring, grout — for construction projects. Are you currently in finishing phase on any projects?

Rajesh: Yes, we are finishing an apartment block right now.

AI Agent: Are you happy with your paint supplier or are there any issues?

Rajesh: We use Jotun. They're okay but sometimes colour matching for custom shades is off. We had to repaint two floors last month.

AI Agent: We represent Crown and Dulux commercial ranges with precision colour-matching technology — variance of less than 0.5 delta E. For a finishing project that could save real rework costs.

Rajesh: Interesting. But we have a loyalty programme with Jotun, so switching is not simple.

AI Agent: Completely understand. Could we at least send you samples so you can see the quality yourself? No obligation.

Rajesh: Sure, send samples to our site office. I'll have a look.

AI Agent: Will do. Thank you, Rajesh.`,
    },
  },
  {
    name: "Sultan Al-Dosari",
    phoneNumber: "+97470123456",
    company: "Al-Dosari Real Estate",
    industry: "Real Estate",
    callDaysAgo: [20, 10, 2],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Site preparation and design",
      materialsNeeded: ["Block work materials", "Waterproofing", "Foundation insulation"],
      purchaseTimelineDays: 90,
      currentSupplier: "Not yet selected",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Too early in design phase to commit", "Multiple tenderers being considered"],
      painPoints: ["Difficult to find certified waterproofing products in Qatar", "Concerns about material quality guarantees"],
      summary: "Sultan is developing a boutique hotel in Al-Rayyan and is in early procurement planning. He is evaluating multiple suppliers and will issue a formal tender. He asked for our company profile and asked to be included in the tender.",
      followupNeeded: true,
      recommendedFollowupMessage: "Dear Sultan, as discussed — I've attached our company profile and product catalogue. We would be delighted to be invited to your tender for the Al-Rayyan hotel project. Please let us know when the tender pack is ready.",
      transcript: `AI Agent: Good morning. May I speak with Sultan Al-Dosari?

Sultan: Yes, this is Sultan.

AI Agent: Good morning Sultan. Gulf Materials Supply here. We supply construction materials for hotel and hospitality projects. I understand you are developing a project in Al-Rayyan. Is that right?

Sultan: Yes, a boutique hotel. We are still in design stage. Construction starts in about four months.

AI Agent: Understood. It's actually ideal to talk now — procurement planning for materials like waterproofing and insulation should start early for quality projects. Do you have suppliers in mind yet?

Sultan: No, we will issue a tender. We want at least three quotations for main materials.

AI Agent: We would love to be included. We are known for waterproofing systems — Sika and BASF certified applicators. Can I send you our company profile for consideration in your tender?

Sultan: Yes, please do. Send it to my email and I'll pass to our project manager.

AI Agent: Of course. We'll follow up to make sure you received it. Thank you, Sultan.`,
    },
  },
  {
    name: "Arjun Nair",
    phoneNumber: "+97430567890",
    company: "Hamad Bin Khalid Contracting",
    industry: "Construction",
    callDaysAgo: [18, 7],
    signals: {
      decisionMaker: false,
      activeProjects: true,
      projectStage: "Pre-tender and BOQ preparation",
      materialsNeeded: ["Reinforcement steel", "Formwork materials", "Concrete admixtures"],
      purchaseTimelineDays: 120,
      currentSupplier: "Not yet selected",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Project not yet awarded to contractor", "Budget not finalised"],
      painPoints: ["Material price volatility makes BOQ preparation difficult"],
      summary: "Arjun is a quantity surveyor preparing a BOQ for a school project. The project is at tender stage and he is looking for indicative material prices. He asked for a price list for BOQ purposes and to be contacted once the project is awarded.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Arjun, I've attached an indicative price list for reinforcement, concrete and formwork for your BOQ. Please note these are indicative and valid for 30 days. Once the project is awarded, I'll be happy to provide firm quotations.",
      transcript: `AI Agent: Good afternoon. Is this Arjun Nair?

Arjun: Yes, speaking.

AI Agent: Good afternoon. Gulf Materials Supply here. We supply structural materials for construction projects. Are you working on any upcoming projects that need materials procurement?

Arjun: I'm doing QS work on a school project. We are preparing the BOQ for tender submission. I need indicative prices for rebar and concrete.

AI Agent: We can provide a current price list for rebar and concrete admixtures — useful for BOQ. When is the project expected to start?

Arjun: Construction won't start for at least four months. The tender hasn't closed yet.

AI Agent: Understood. If we give you today's indicative prices, would that help your BOQ preparation?

Arjun: Yes, that would help. Send it to me.

AI Agent: Will do. Are you the one who will handle procurement once the project is awarded?

Arjun: No, that'll be the project manager. But I can recommend suppliers.

AI Agent: Great. Let me send you the price list today, and can we check in once the project is awarded?

Arjun: Yes, please. Call me in about two months.

AI Agent: Perfect, Arjun. Thank you.`,
    },
  },
  {
    name: "Maria Reyes",
    phoneNumber: "+97459234567",
    company: "MIDMAC Contracting",
    industry: "Construction",
    callDaysAgo: [15, 6],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Roof finishing and external works",
      materialsNeeded: ["Roof waterproofing", "Expansion joints", "Caulking"],
      purchaseTimelineDays: 50,
      currentSupplier: "SOPREMA",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Architect specifies SOPREMA products"],
      painPoints: ["SOPREMA products expensive", "Long delivery times for some SOPREMA products"],
      summary: "Maria manages specialist waterproofing procurement at MIDMAC. She is looking for equivalents to SOPREMA products. She asked for technical comparison data and a callback next week.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Maria, as discussed — attached is a technical equivalency comparison between our Firestone EPDM membranes and SOPREMA Alsan, including test data. We also have an architect approval letter template. Call me if you need help presenting this to the specifier.",
      transcript: `AI Agent: Good morning. May I speak with Maria Reyes?

Maria: Speaking, yes.

AI Agent: Good morning Maria. Gulf Materials Supply here. We supply waterproofing membranes and roofing materials. I understand MIDMAC is doing roof works on a current project — is that right?

Maria: Yes, we're in the final roofing phase. But we already have SOPREMA specified for waterproofing.

AI Agent: SOPREMA is excellent quality. Are you finding any challenges with pricing or availability?

Maria: The Alsan resin is quite expensive and there's a 6-week lead time from France right now. We're under programme pressure.

AI Agent: We distribute Firestone EPDM membranes which are technically equivalent and CE marked — and they're in stock locally. We can also help with the architect approval process.

Maria: That's interesting. Can you send me a technical comparison?

AI Agent: Absolutely. I'll send it today. Can I follow up with you next week?

Maria: Yes, call me Monday. Thank you.`,
    },
  },
  {
    name: "Pradeep Chandran",
    phoneNumber: "+97432456780",
    company: "Doha Contracting Co.",
    industry: "Construction",
    callDaysAgo: [14, 5],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Structural works",
      materialsNeeded: ["Cement", "Steel rebar", "Concrete additives"],
      purchaseTimelineDays: 70,
      currentSupplier: "QNC and Qatar Steel",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["Good relationship with Qatar Steel, hard to break", "Pricing competitive enough currently"],
      painPoints: ["Occasional cement shortage", "High prices for sulfate-resistant cement"],
      summary: "Pradeep is procurement supervisor at Doha Contracting. He is content with current suppliers but interested in specialty cement grades. He accepted our pricing information but didn't request a formal quote.",
      followupNeeded: false,
      recommendedFollowupMessage: "Hi Pradeep, I wanted to share our latest pricing for sulfate-resistant and low-alkali cement — grades that are harder to source locally. If you have upcoming requirements, we are well-stocked. Let me know if you'd like a quote.",
      transcript: `AI Agent: Good afternoon. Is this Pradeep Chandran?

Pradeep: Yes, who's calling?

AI Agent: Good afternoon. Gulf Materials Supply here. We supply structural materials — cement, rebar, concrete additives. We wanted to introduce ourselves to Doha Contracting. Are you in charge of materials procurement?

Pradeep: Yes, I handle that. We have our regular suppliers for cement and rebar though.

AI Agent: Completely understand. Are there any specialty grades you find hard to source? Things like sulfate-resistant cement or low-alkali blends?

Pradeep: Actually yes, sulfate-resistant sometimes runs short locally. We needed some last month and had to import.

AI Agent: We keep SR cement in stock continuously — it's one of our core products. I'll send you our pricing. No pressure, just good to have a backup option.

Pradeep: Okay, send it over. I'll keep it on file.

AI Agent: Will do. Thank you, Pradeep.`,
    },
  },
  {
    name: "Faisal Al-Marri",
    phoneNumber: "+97437901234",
    company: "Middle East Concrete",
    industry: "Ready-Mix Concrete",
    callDaysAgo: [11, 4],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Ongoing concrete supply operations",
      materialsNeeded: ["Cement", "Flyash", "Concrete admixtures", "Aggregates"],
      purchaseTimelineDays: 45,
      currentSupplier: "QNC, Busan Cement",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Volume commitments tied to existing supply contracts"],
      painPoints: ["Flyash availability inconsistent", "Admixture prices increasing"],
      summary: "Faisal is commercial director at a ready-mix concrete plant. He is interested in alternative flyash and admixture suppliers to reduce costs. He asked to be contacted after he reviews our pricing catalogue.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Faisal, I've attached our admixture product range including pricing for superplasticisers, retarders and flyash. We can offer volume contracts with price locks. When would be a good time for a detailed meeting?",
      transcript: `AI Agent: Good morning. May I speak with Faisal Al-Marri at Middle East Concrete?

Faisal: This is Faisal.

AI Agent: Good morning Faisal. Gulf Materials Supply here. We supply admixtures, flyash and specialty cement for concrete producers. I wanted to introduce our product range.

Faisal: We use BASF Master Builders for admixtures. What are you offering that's different?

AI Agent: We carry SIKA admixtures — often 12 to 15% cheaper than BASF for equivalent technical performance. We also have a consistent flyash supply from India — flyash availability is patchy in Qatar right now.

Faisal: The flyash issue is real. Our current source has been unreliable this quarter. What quantities can you supply monthly?

AI Agent: Up to 2,000 tonnes of flyash per month, and full range of admixtures. I can send you a catalogue with technical datasheets and pricing today.

Faisal: Send it over. I'll review and if it looks good, call me next week.

AI Agent: Will do. Thank you, Faisal.`,
    },
  },
  {
    name: "Roberto Manalo",
    phoneNumber: "+97464012345",
    company: "China State Construction Qatar",
    industry: "Construction",
    callDaysAgo: [10, 2],
    signals: {
      decisionMaker: false,
      activeProjects: true,
      projectStage: "Mechanical and electrical installation",
      materialsNeeded: ["Electrical cables", "Conduit", "Cable glands"],
      purchaseTimelineDays: 60,
      currentSupplier: "Prysmian Qatar",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Chinese head office has preferred vendors list", "Not a procurement decision maker"],
      painPoints: ["HO vendor approval takes months", "Local procurement for small items is faster"],
      summary: "Roberto is an MEP site engineer at China State Construction. He is interested in local cable supply for smaller quantities. He passed on the procurement manager's contact and asked to call back after introducing us.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Roberto, as discussed — please feel free to introduce me to your procurement manager Mr. Chen. I can send a full product catalogue and pricing for cables and conduit. Looking forward to connecting.",
      transcript: `AI Agent: Good afternoon. Is this Roberto Manalo at China State Construction?

Roberto: Yes, this is Roberto.

AI Agent: Good afternoon Roberto. Gulf Materials Supply here. We supply electrical cables and conduit locally in Qatar. Do you have current MEP material requirements?

Roberto: We use Prysmian for cables mostly. Main procurement is handled by our Chinese head office vendors.

AI Agent: Understood. For smaller urgent orders or supplementary supply, do you ever source locally?

Roberto: Yes, for small quantities or urgent stuff we do buy local. Who do I contact for cable trays and small conduit orders?

AI Agent: Me directly — same-day supply on most items. Who should I connect with for larger planned orders?

Roberto: That would be Mr. Chen, our procurement manager. But he's strict about new vendors. Maybe if you introduce yourself to him, I can put in a good word.

AI Agent: That would be very helpful. Can you send me his contact details or introduce us by email?

Roberto: I'll do it. Call me back next week to confirm.

AI Agent: Thank you, Roberto. I appreciate it.`,
    },
  },
  {
    name: "Yousef Al-Sada",
    phoneNumber: "+97439678901",
    company: "Lusail Marina Development",
    industry: "Real Estate Development",
    callDaysAgo: [13, 4],
    signals: {
      decisionMaker: false,
      activeProjects: true,
      projectStage: "Marine and coastal works",
      materialsNeeded: ["Marine grade concrete", "Epoxy coatings", "Cathodic protection systems"],
      purchaseTimelineDays: 70,
      currentSupplier: "Wacker Chemie",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Specialized marine products require engineer approval", "Not the procurement decision maker"],
      painPoints: ["Marine grade materials hard to find in Qatar", "High cost of imported specialist products"],
      summary: "Yousef is project engineer for marine works at Lusail Marina. He is looking for local suppliers of marine-grade materials but decision authority sits with the project manager. He asked for a technical catalogue to share with decision makers.",
      followupNeeded: true,
      recommendedFollowupMessage: "Dear Yousef, as discussed — I've attached our marine-grade concrete additives and epoxy coatings catalogue with technical datasheets. All products carry BS EN certification suitable for marine environments. Please share with your project manager and let me know if a technical meeting would help.",
      transcript: `AI Agent: Good morning. May I speak with Yousef Al-Sada?

Yousef: Yes, this is Yousef.

AI Agent: Good morning Yousef. Gulf Materials Supply here. We supply specialty materials for marine and coastal construction — marine grade concrete additives, anti-corrosion coatings and cathodic protection. Are you involved in the Lusail Marina development?

Yousef: Yes, I'm the project engineer for the jetty and marina basin works.

AI Agent: Excellent. Are you finding marine-grade materials locally or importing?

Yousef: Mostly importing. Wacker Chemie is our main supplier but everything comes from Germany. It's expensive and slow.

AI Agent: We represent similar German and Austrian manufacturers locally. Marine concrete admixtures, epoxy coatings — all stocked in Doha. Are you able to approve new material suppliers?

Yousef: Not by myself, that goes through the project manager. But I can recommend.

AI Agent: Can I send you a technical catalogue to pass to your PM?

Yousef: Yes. Send it. I'll pass it on and call you back next week if he's interested.

AI Agent: Perfect. Thank you, Yousef.`,
    },
  },
  {
    name: "Tariq Al-Ansari",
    phoneNumber: "+97471456789",
    company: "Al-Ansari Trading",
    industry: "Trading",
    callDaysAgo: [8, 1],
    signals: {
      decisionMaker: true,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: ["General building materials"],
      purchaseTimelineDays: 60,
      currentSupplier: "Multiple local suppliers",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["No specific project right now", "Pricing must be very competitive for resale"],
      painPoints: ["Margins compressed on standard materials", "Quality inconsistency from cheap suppliers"],
      summary: "Tariq runs a trading company supplying small contractors. He is looking for reliable bulk supply of basic materials at competitive pricing for resale. He asked for our wholesale price list.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hello Tariq, as promised — I've attached our wholesale price list for cement, aggregate and block. We offer 30-day credit terms for established traders. Let me know when you want to meet to discuss terms.",
      transcript: `AI Agent: Good morning. Is this Tariq Al-Ansari?

Tariq: Speaking. What is this about?

AI Agent: Good morning Tariq. Gulf Materials Supply here. We supply bulk materials to traders and contractors. I understand Al-Ansari Trading is in the materials business?

Tariq: Yes, we supply small contractors. Mostly cement, blocks, aggregate.

AI Agent: We can supply you at wholesale rates with 30-day credit terms. Are you currently getting competitive pricing from your suppliers?

Tariq: Margins are very tight. Everyone is competing on price.

AI Agent: We focus on quality and reliability — which matters to your small contractor clients. Can I send you our wholesale price list?

Tariq: Sure, send it. If the prices are right, we can do business.

AI Agent: Will do. I'll also call you at end of week to see if you have questions.

Tariq: Okay. Bye.`,
    },
  },

  // ── HOT LEADS — June 18-20 ────────────────────────────────────────────────
  {
    name: "Khalifah Al-Mohannadi",
    phoneNumber: "+97444123456",
    company: "Al-Mohannadi Contracting",
    industry: "Construction",
    callDaysAgo: [3, 0],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Superstructure — core and column erection",
      materialsNeeded: ["Structural steel H-sections", "Steel plates", "Shear studs"],
      purchaseTimelineDays: 18,
      currentSupplier: "ArcelorMittal (imported)",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Import order in transit — may still arrive", "Engineer must approve local mill certs"],
      painPoints: ["Import shipment held at Hamad Port customs for 10 days", "Project programme at risk of 3-week overrun", "Daily penalty clauses with client"],
      summary: "Khalifah is procurement director at Al-Mohannadi Contracting on a twin-tower residential project in Lusail. An imported structural steel shipment is stuck at customs with no release date. He needs local supply immediately to avoid penalty clauses. Full decision-making authority confirmed; requested formal quote with mill certificates.",
      followupNeeded: true,
      recommendedFollowupMessage: "Good morning Khalifah, as promised — attached is our quote for 200 tonnes of Grade 50 H-sections and steel plates with full mill certificates and CE marking. Stock is ready for delivery within 24 hours. Please review and call me to confirm — we can issue the delivery order the same day.",
      transcript: `AI Agent: As-salamu alaykum, may I speak with Khalifah Al-Mohannadi?

Khalifah: Wa alaykum as-salam. Yes this is Khalifah. Who is calling?

AI Agent: Good morning Khalifah. Gulf Materials Supply here. Following up on our call last week — any resolution on the customs issue?

Khalifah: No, nothing. Ten days at the port now. Customs is asking for additional mill documentation from Europe — another two weeks minimum.

AI Agent: That puts you in a serious position. We have Grade 50 H200 and H250 sections in stock right now. What quantities do you need?

Khalifah: Around 200 tonnes of mixed H-sections — mostly 200×200 and 250×200. Also 15 tonnes of 20mm and 25mm plate.

AI Agent: We have all of that. I can have a formal quote with mill certificates and CE documentation ready within the hour. Same grade and standard as your import order?

Khalifah: Yes. If your certs are clean, my structural engineer will approve quickly. I can sign a local purchase order today.

AI Agent: I'll send the quote by noon. Can you confirm your engineer can review today so we start delivery tomorrow morning?

Khalifah: If the price is right and certs are clean, yes. Call me after you send it — I want to move fast.

AI Agent: Understood. You'll have it within the hour. Thank you, Khalifah.`,
    },
  },
  {
    name: "Shankar Iyer",
    phoneNumber: "+97477890123",
    company: "STFA Contracting Qatar",
    industry: "Construction",
    callDaysAgo: [5, -1],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "MEP rough-in — electrical and mechanical services",
      materialsNeeded: ["PVC conduit", "Cable trays", "Junction boxes", "Flexible conduit"],
      purchaseTimelineDays: 25,
      currentSupplier: "Clipsal Qatar (Schneider)",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Schneider has approved brand status on this project", "Switching needs consultant engineer sign-off"],
      painPoints: ["Clipsal 20mm conduit on backorder since last week", "MEP subcontractor paused work — site idle", "Engineer threatening liquidated damages"],
      summary: "Shankar is the procurement manager for STFA Contracting on a large commercial office fit-out. The Schneider-approved brand conduit is on backorder and his MEP sub has paused work. He has authority to approve equivalent-spec alternatives and requested a quote with technical equivalency documentation to present to the consultant.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Shankar, as requested — attached is our quote for PVC conduit and cable trays with a technical equivalency sheet comparing our products against the Clipsal specification. All items are IEC 61386 certified. Please forward to the consultant engineer for approval — we have a pre-prepared approval letter template if helpful.",
      transcript: `AI Agent: Good morning. May I speak with Shankar Iyer at STFA Contracting?

Shankar: Yes, Shankar here. Go ahead.

AI Agent: Good morning Shankar. Gulf Materials Supply here, following up from our call last week about the conduit situation. Has it resolved?

Shankar: No, it's gotten worse. The MEP subcontractor stopped work on Tuesday. Clipsal's distributor is saying minimum three weeks for 20mm conduit. My site manager is going crazy.

AI Agent: We have 80,000 metres of PVC conduit — 16mm, 20mm and 25mm — in stock in Doha right now. What total quantity do you need?

Shankar: We need about 35,000 metres of 20mm, 12,000 metres of 25mm, and 8,000 metres of 16mm. Plus matching cable trays — around 4,500 metres mixed width.

AI Agent: We can supply all of that this week. The issue is your project spec mentions Clipsal. Do you have flexibility on approved equivalents?

Shankar: I can get an equivalent approved if you give me technical data showing it meets the same standard. IEC 61386 — that's what the spec calls out.

AI Agent: Our conduit is manufactured to IEC 61386 by a certified European supplier. I'll send a technical equivalency sheet alongside the quote. Can your consultant turn around approval quickly?

Shankar: If the data sheet is clean, he'll approve within 24 hours. He's been trying to help us. Send me the quote and the tech sheet today.

AI Agent: On it — you'll have everything by 3pm. I'll call you tomorrow morning.

Shankar: Please do. Thank you.`,
    },
  },
  {
    name: "Walid Al-Nasr",
    phoneNumber: "+97455567890",
    company: "Al-Nasr Projects",
    industry: "Construction",
    callDaysAgo: [-2],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Foundation and substructure — raft slab pour",
      materialsNeeded: ["Ready-mix concrete C35/20", "Concrete pump hire", "Rebar spacers"],
      purchaseTimelineDays: 10,
      currentSupplier: "Qatar Ready Mix",
      openToAlternatives: true,
      requestedQuote: true,
      followUpRequested: true,
      objections: ["Qatar Ready Mix has an existing order placed", "Needs concrete mix design approval from engineer"],
      painPoints: ["Qatar Ready Mix cancelled a pour last minute due to plant breakdown", "Raft slab pour scheduled for tomorrow — at risk", "Client holding retention payment pending milestone"],
      summary: "Walid is the managing director of Al-Nasr Projects and directly overseeing a 3,200 sqm raft slab pour scheduled for the following morning. His primary supplier had a plant breakdown and cancelled. He needs a confirmed alternative supplier today and requested an urgent quote with mix design documentation.",
      followupNeeded: true,
      recommendedFollowupMessage: "Dear Walid, as discussed — attached is our urgent quote for 960 cubic metres of C35/20 ready-mix with full mix design report approved to BS 8500. Our fleet can mobilise from 6am tomorrow. Please confirm order by 8pm tonight so we can schedule plant allocation.",
      transcript: `AI Agent: Good morning. Is this Walid Al-Nasr from Al-Nasr Projects?

Walid: Yes, this is Walid. Make it quick please, I'm on site.

AI Agent: Of course. Gulf Materials Supply here. We supply ready-mix concrete in Doha. I understand you're planning a major pour — any supply issues I should know about?

Walid: How did you know? Qatar Ready Mix just called me an hour ago — their plant broke down. My raft slab pour is tomorrow morning. 960 cubic metres. Can you do it?

AI Agent: Yes. I need to confirm plant availability but I believe we can. What mix design are you on — C35/20?

Walid: C35/20 sulphate-resistant, slump class S3. The engineer is very strict on documentation.

AI Agent: We have an approved mix design for C35/20 SR to BS 8500. I'll confirm plant allocation in 30 minutes and call you back with a firm commitment. What time does your pour start?

Walid: First truck needs to be on site by six in the morning. Can you guarantee that?

AI Agent: I will confirm that in 30 minutes. If we can commit, are you ready to sign a purchase order today?

Walid: Today, right now. I just need your confirmation. Call me back.

AI Agent: Calling you back at eleven. Thank you, Walid.`,
    },
  },

  // ── WARM LEADS — June 18-20 ───────────────────────────────────────────────
  {
    name: "Chen Wei",
    phoneNumber: "+97466234567",
    company: "Bouygues Construction Qatar",
    industry: "Construction",
    callDaysAgo: [2, 0],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Interior fit-out — office and hospitality floors",
      materialsNeeded: ["Raised access flooring", "Acoustic ceiling tiles", "Partition systems"],
      purchaseTimelineDays: 90,
      currentSupplier: "Armstrong World Industries",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Contract not yet signed for Phase 2", "Armstrong already approved by architect on Phase 1"],
      painPoints: ["Armstrong lead time stretching to 12 weeks", "Phase 2 budget under review — cost savings required"],
      summary: "Chen Wei is local procurement lead at Bouygues for a mixed hospitality and office tower. Phase 2 fit-out contract is awaiting signature and budget review may require alternative products to Armstrong. He is the decision maker but cannot commit until the contract is finalised. He asked to be contacted in 4-6 weeks.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Chen, as discussed — I've attached our product sheet for raised access flooring and acoustic ceiling systems with a cost comparison versus Armstrong. Our products carry the same CE certification and the saving is approximately 17% at your volume. Happy to arrange a sample presentation for the interior designer when ready.",
      transcript: `AI Agent: Good morning. May I speak with Chen Wei at Bouygues Construction?

Chen Wei: This is Chen. Good morning.

AI Agent: Good morning Chen. Gulf Materials Supply — we spoke two days ago about fit-out materials for Phase 2. Has there been any update on the contract status?

Chen Wei: Still waiting on signature from the client. Legal review is taking longer than expected. Could be another three or four weeks.

AI Agent: Understood. While you wait, would it be useful to have a cost comparison on the fit-out materials? I know you mentioned budget pressure on Phase 2.

Chen Wei: Actually yes. Our QS has been asked to find 5% savings on the fit-out package. If you can offer equivalent spec at lower cost, that's worth exploring.

AI Agent: We supply raised access flooring and acoustic ceiling tiles that meet the same CE standard as Armstrong. For your estimated Phase 2 area we're looking at around 15 to 18% cost difference. I can prepare a formal comparison document.

Chen Wei: That could be very useful. Send me the comparison and product data sheets. When the contract is signed I'll be able to move quickly.

AI Agent: I'll have it to you by end of day. Should I call you in about four weeks to follow up?

Chen Wei: Yes, do that. Thank you.`,
    },
  },
  {
    name: "Laxmi Prasad",
    phoneNumber: "+97433789012",
    company: "Gulf Building Services",
    industry: "Construction",
    callDaysAgo: [-1],
    signals: {
      decisionMaker: true,
      activeProjects: true,
      projectStage: "Finishing works — flooring and wall finishes",
      materialsNeeded: ["Epoxy flooring", "Wall paint", "Screed compound"],
      purchaseTimelineDays: 70,
      currentSupplier: "Sika Qatar",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Sika approved by the main contractor on this project", "Switching requires resubmission to the consultant"],
      painPoints: ["Sika epoxy flooring cost increased 22% this year", "Lead time extended to 4 weeks due to regional demand"],
      summary: "Laxmi is procurement manager at Gulf Building Services handling finishing works on a large government office complex. She is frustrated with Sika's pricing and lead times and open to evaluating alternatives for future projects. She asked for a product comparison and a callback in 6 weeks.",
      followupNeeded: true,
      recommendedFollowupMessage: "Hi Laxmi, as discussed — attached is our product comparison for epoxy flooring and screed systems versus Sika, including pricing and delivery times. We can offer a 14-day lead time from local stock. For your next project we would be happy to support the consultant approval process.",
      transcript: `AI Agent: Good afternoon. May I speak with Laxmi Prasad at Gulf Building Services?

Laxmi: Speaking. Who is this?

AI Agent: Good afternoon. Gulf Materials Supply here. We supply flooring systems and wall finishes. Are you currently in finishing works on any projects?

Laxmi: Yes, we're doing an office complex in West Bay. Flooring and paint.

AI Agent: Are you finding any supply challenges at the moment?

Laxmi: Sika has been painful — prices up again and delivery is now four weeks. We're under programme pressure.

AI Agent: We supply BASF and local-stocked epoxy flooring systems with equivalent technical performance. Lead time is two weeks and pricing is notably lower. Are you able to consider alternatives?

Laxmi: On this project the spec is Sika — it's been approved by the consultant. Changing now would require a resubmission which takes time we don't have.

AI Agent: Completely understood. What about future projects — would it be worth having us on your approved list so you have an option?

Laxmi: Yes, for future projects definitely. Send me a comparison. I'll look at it when this project calms down — maybe six weeks.

AI Agent: I'll send it today. I'll follow up in six weeks. Thank you, Laxmi.`,
    },
  },
  {
    name: "Samir Al-Hajri",
    phoneNumber: "+97472345678",
    company: "Al-Hajri Real Estate Development",
    industry: "Real Estate Development",
    callDaysAgo: [3, -2],
    signals: {
      decisionMaker: false,
      activeProjects: true,
      projectStage: "Landscape and external works",
      materialsNeeded: ["Irrigation pipes", "Paving blocks", "Planting soil", "Boundary walling blocks"],
      purchaseTimelineDays: 80,
      currentSupplier: "Not yet selected",
      openToAlternatives: true,
      requestedQuote: false,
      followUpRequested: true,
      objections: ["Not the final decision maker — project manager approves", "Landscape design still being finalised"],
      painPoints: ["First time procuring landscape materials — unsure of local suppliers", "Budget tight for external works"],
      summary: "Samir is a site coordinator at Al-Hajri Real Estate overseeing a villa compound project in Al-Gharrafa. External works are starting in about three months and no landscape supplier has been selected yet. He is not the decision maker but can influence the selection. He asked for a catalogue and a site visit proposal to present to the project manager.",
      followupNeeded: true,
      recommendedFollowupMessage: "Dear Samir, as discussed — attached is our landscape and external works catalogue including irrigation pipes, paving blocks and walling systems with indicative pricing. We would welcome a brief site visit to understand your project requirements and prepare a proposal for the project manager's review.",
      transcript: `AI Agent: Good morning. Is this Samir Al-Hajri?

Samir: Yes, this is Samir. Who is calling?

AI Agent: Good morning Samir. Gulf Materials Supply here. Following up on our conversation last week about your Al-Gharrafa villa compound.

Samir: Oh yes. The landscape works are still a few months away. We're still in design.

AI Agent: Understood. Have you made any progress on selecting landscape material suppliers?

Samir: No, not yet. The project manager hasn't started that process. To be honest I'm not sure where to begin — this is my first project coordinating external works.

AI Agent: We can help simplify that. We supply irrigation pipes, paving, walling blocks and planting soils — all from one source, which reduces your coordination overhead.

Samir: That would be useful. The PM likes single-source supply to reduce paperwork. Can you put together something I can show him?

AI Agent: Absolutely. I'll send a catalogue with indicative pricing today. We can also offer to visit site when you're ready so we can understand the full scope and prepare a proper proposal for the PM's review.

Samir: That would be great. He'll want to see a proposal, not just a price list. Call me in about three weeks and we can set up the site visit.

AI Agent: Perfect. I'll send the catalogue now and call you in three weeks. Thank you, Samir.`,
    },
  },

  // ── COLD LEADS — June 18-20 ──────────────────────────────────────────────
  {
    name: "Patricia Santos",
    phoneNumber: "+97465678901",
    company: "Santos Property Management",
    industry: "Property Management",
    callDaysAgo: [0],
    signals: {
      decisionMaker: true,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: [],
      purchaseTimelineDays: null,
      currentSupplier: "",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["No construction projects — maintenance only", "All maintenance done by FM contractor"],
      painPoints: [],
      summary: "Patricia manages a residential property portfolio with no active construction or large renovation projects. Maintenance is handled through an FM contractor. Not a relevant prospect for commercial materials supply.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — property management only, no volume procurement requirements.",
      transcript: `AI Agent: Good morning. May I speak with Patricia Santos?

Patricia: Yes, this is Patricia. What is this regarding?

AI Agent: Good morning Patricia. Gulf Materials Supply here. We supply construction and renovation materials. Do you have any active projects we could help with?

Patricia: We're a property management company. We don't do construction. Any maintenance issues go through our FM contractor.

AI Agent: I see. Are there any upcoming renovation works planned for any of the properties?

Patricia: No, nothing major. Just routine maintenance — painting and small repairs. The FM company handles that.

AI Agent: Understood. I'll note that and won't take up more of your time. Thank you, Patricia.

Patricia: Okay. Goodbye.`,
    },
  },
  {
    name: "Hamid Al-Mulla",
    phoneNumber: "+97441234567",
    company: "Al-Mulla Group Holdings",
    industry: "Holding Company",
    callDaysAgo: [-1],
    signals: {
      decisionMaker: false,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: [],
      purchaseTimelineDays: null,
      currentSupplier: "",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["Holding company — no direct construction procurement", "Wrong contact, needs to go to subsidiary"],
      painPoints: [],
      summary: "Hamid is an executive assistant at Al-Mulla Group Holdings. The group's construction subsidiary handles all procurement separately. This was a misrouted call and he asked to be removed from the contact list.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — misrouted to holding company. Contact Al-Mulla Engineering & Construction subsidiary directly.",
      transcript: `AI Agent: Good morning. May I speak with Hamid Al-Mulla?

Hamid: Yes, this is Hamid. What is this call about?

AI Agent: Good morning. Gulf Materials Supply here. We supply construction materials across Qatar and wanted to introduce our services to Al-Mulla Group.

Hamid: You have the wrong department. This is the group holding office. We don't do construction here — that's a separate company, Al-Mulla Engineering and Construction. Different address, different management.

AI Agent: I apologise for the confusion. Could you share any contact information for the right team?

Hamid: You can find them through the Chamber of Commerce. Please update your records — this number shouldn't be in your construction contact list.

AI Agent: Noted and sincere apologies for the inconvenience. We'll update our records immediately. Thank you, Hamid.

Hamid: Fine. Goodbye.`,
    },
  },
  {
    name: "Thomas Kovoor",
    phoneNumber: "+97478901234",
    company: "KV Engineering Consultants",
    industry: "Engineering Consultancy",
    callDaysAgo: [-2],
    signals: {
      decisionMaker: false,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: [],
      purchaseTimelineDays: null,
      currentSupplier: "",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["Consultancy firm — does not purchase materials", "Contractors handle all procurement"],
      painPoints: [],
      summary: "Thomas is a civil engineer at a design consultancy. His firm specifies materials but never procures them — that responsibility lies with the main contractor on each project. Not a viable direct prospect.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — engineering consultancy, all procurement handled by contractors.",
      transcript: `AI Agent: Good afternoon. May I speak with Thomas Kovoor?

Thomas: Speaking. How can I help you?

AI Agent: Good afternoon Thomas. Gulf Materials Supply here. We supply civil and structural materials. I wanted to see if KV Engineering has any upcoming material requirements.

Thomas: We're consultants. We write the specs but the contractors do all the buying. We have nothing to do with procurement.

AI Agent: Of course — that makes sense. Would it be worth sharing our product data sheets so you can consider specifying our products on future projects?

Thomas: We specify based on performance standards, not brand preference. And we already have a comprehensive approved materials list from our clients. I don't think there's a fit here.

AI Agent: Understood completely. I won't take any more of your time. Thank you, Thomas.

Thomas: No problem. Goodbye.`,
    },
  },

  // ── COLD LEADS ──────────────────────────────────────────────────────────────
  {
    name: "Majed Al-Khulaifi",
    phoneNumber: "+97433456780",
    company: "Al-Khulaifi Holdings",
    industry: "Holding Company",
    callDaysAgo: [29],
    signals: {
      decisionMaker: false,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: [],
      purchaseTimelineDays: null,
      currentSupplier: "",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["Not involved in construction procurement", "Wrong contact"],
      painPoints: [],
      summary: "Majed is a holding company director not directly involved in construction procurement. He redirected the call to their subsidiary company's project manager and asked not to be contacted again.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — contact was misrouted. Recommend reaching out to Al-Khulaifi Construction subsidiary directly.",
      transcript: `AI Agent: Good morning. May I speak with Majed Al-Khulaifi?

Majed: Yes, this is Majed. What is this?

AI Agent: Good morning. Gulf Materials Supply here. We supply construction materials. I wanted to reach out to Al-Khulaifi regarding any material procurement needs.

Majed: We are a holding company. We don't do construction directly. You need to call our subsidiary — Al-Khulaifi Construction. I'm not the right person.

AI Agent: I apologise for the confusion. Could you give me the right contact at the subsidiary?

Majed: You can find them online. Please don't call this number for these matters. Thank you.

AI Agent: Understood, apologies for the inconvenience. Thank you.`,
    },
  },
  {
    name: "Sanjay Verma",
    phoneNumber: "+97452012345",
    company: "SV Engineering Consultants",
    industry: "Engineering Consultancy",
    callDaysAgo: [27],
    signals: {
      decisionMaker: false,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: [],
      purchaseTimelineDays: null,
      currentSupplier: "",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["We are a consultancy — we don't buy materials", "Wrong target audience"],
      painPoints: [],
      summary: "Sanjay is a civil engineering consultant who does not purchase materials. He is not a relevant prospect and was politely uninterested.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — engineering consultancy, not a materials buyer.",
      transcript: `AI Agent: Good afternoon. May I speak with Sanjay Verma?

Sanjay: Speaking.

AI Agent: Good afternoon Sanjay. Gulf Materials Supply here. We supply construction materials and wanted to see if your firm has any requirements.

Sanjay: We're a consultancy firm. We don't buy materials — that's the contractor's responsibility.

AI Agent: Of course, I apologize for the confusion. Thank you for your time, Sanjay.

Sanjay: No problem. Goodbye.`,
    },
  },
  {
    name: "Josefina Ramos",
    phoneNumber: "+97465890123",
    company: "Ramos Interior Design",
    industry: "Interior Design",
    callDaysAgo: [25],
    signals: {
      decisionMaker: false,
      activeProjects: true,
      projectStage: "Interior design specification",
      materialsNeeded: ["Decorative tiles", "Paints"],
      purchaseTimelineDays: null,
      currentSupplier: "Various retail suppliers",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["We specify, we don't procure large quantities", "Our clients buy from retail"],
      painPoints: [],
      summary: "Josefina runs an interior design firm. She specifies materials but clients handle procurement through retail channels. Not a relevant prospect for commercial supply volumes.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — retail-scale specification only, not commercial volume buyer.",
      transcript: `AI Agent: Good morning. May I speak with Josefina Ramos?

Josefina: Yes, hello.

AI Agent: Good morning Josefina. Gulf Materials Supply here. We supply decorative tiles and finishes for interior projects. Do you have any current project requirements?

Josefina: I'm a designer. I specify materials but my clients buy from retail shops. I don't order in bulk.

AI Agent: Understood. Would you be interested in our product catalogue for specification purposes?

Josefina: Not right now, thank you. Maybe another time.

AI Agent: Of course. Thank you for your time.`,
    },
  },
  {
    name: "Anil Gupta",
    phoneNumber: "+97434123456",
    company: "Gupta Property Management",
    industry: "Property Management",
    callDaysAgo: [23],
    signals: {
      decisionMaker: true,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: [],
      purchaseTimelineDays: null,
      currentSupplier: "",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["No active construction projects", "Only maintenance work — very small quantities"],
      painPoints: [],
      summary: "Anil manages a property portfolio with only small maintenance requirements. He is not interested in commercial supply volumes and has no upcoming construction projects.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — maintenance only, no volume requirements.",
      transcript: `AI Agent: Good afternoon. May I speak with Anil Gupta?

Anil: Yes, this is Anil.

AI Agent: Good afternoon Anil. Gulf Materials Supply here. We supply construction materials to property developers. Are you involved in any construction or major renovation works?

Anil: No, we only do property management. Small maintenance repairs. We buy what we need from the local hardware shop.

AI Agent: I see. Are you planning any large scale renovation in the next few months?

Anil: No, nothing like that. Just maintenance.

AI Agent: Understood. I'll note that for future reference. Thank you, Anil.

Anil: Okay, bye.`,
    },
  },
  {
    name: "Fernando Aquino",
    phoneNumber: "+97454234567",
    company: "Aquino Tiles & Flooring",
    industry: "Retail",
    callDaysAgo: [20],
    signals: {
      decisionMaker: true,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: ["Ceramic tiles"],
      purchaseTimelineDays: null,
      currentSupplier: "RAK Ceramics",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["Already have exclusive RAK Ceramics franchise", "Not interested in other suppliers"],
      painPoints: [],
      summary: "Fernando owns a tile retail shop with an exclusive RAK Ceramics franchise agreement. He is contractually unable to carry competing products. Not a viable prospect.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — exclusive RAK Ceramics franchise, not able to carry alternatives.",
      transcript: `AI Agent: Good morning. May I speak with Fernando Aquino?

Fernando: Speaking. Who is calling?

AI Agent: Good morning Fernando. Gulf Materials Supply here. We import tiles from Italy and Spain. I wanted to see if there's a fit with your business.

Fernando: I have an exclusive franchise with RAK Ceramics. I can't carry other tile brands — it's in my contract.

AI Agent: I completely understand. Thank you for letting me know.

Fernando: No problem. Goodbye.`,
    },
  },
  {
    name: "Angelo Bautista",
    phoneNumber: "+97467345678",
    company: "Al-Mannai Group (Facilities)",
    industry: "Facilities Management",
    callDaysAgo: [17],
    signals: {
      decisionMaker: false,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: ["Small maintenance items"],
      purchaseTimelineDays: null,
      currentSupplier: "Various",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["Very small quantities — facilities maintenance only", "Budget controlled by FM contracts"],
      painPoints: [],
      summary: "Angelo is a facilities maintenance supervisor. All procurement goes through an FM framework contract. He has no authority or relevant volume requirements.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — all procurement through FM framework contract, no direct purchasing authority.",
      transcript: `AI Agent: Good afternoon. May I speak with Angelo Bautista?

Angelo: Yes, this is Angelo.

AI Agent: Good afternoon Angelo. Gulf Materials Supply here. We supply construction and maintenance materials. Do you have any procurement requirements at Al-Mannai?

Angelo: I'm in facilities management. We buy everything through our FM contract. I don't do direct procurement.

AI Agent: I see. Who handles the FM contract on the supply side?

Angelo: That's above my level. All managed by the FM company. Sorry I can't help.

AI Agent: No problem at all. Thank you for your time, Angelo.`,
    },
  },
  {
    name: "Mohan Pillai",
    phoneNumber: "+97471678901",
    company: "Pillai Engineering Services",
    industry: "Engineering Services",
    callDaysAgo: [14],
    signals: {
      decisionMaker: true,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: [],
      purchaseTimelineDays: null,
      currentSupplier: "",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["No active projects currently", "Business slow due to market conditions"],
      painPoints: ["Market is slow, limited new projects"],
      summary: "Mohan runs a small MEP engineering company that is currently not active due to market conditions. He has no upcoming projects and asked not to be contacted for at least six months.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — no active projects, contact after 6 months.",
      transcript: `AI Agent: Good morning. May I speak with Mohan Pillai?

Mohan: Yes, speaking.

AI Agent: Good morning Mohan. Gulf Materials Supply here. We supply MEP materials. Are you currently working on any projects we could support?

Mohan: Business is very slow right now. We haven't had a new project in four months. Market is difficult.

AI Agent: I'm sorry to hear that. Would it be helpful to reconnect in a few months when things pick up?

Mohan: Yes, call me in six months. Nothing is happening now.

AI Agent: Understood. I'll make a note to follow up in six months. Thank you, Mohan.`,
    },
  },
  {
    name: "Rodrigo Fernandez",
    phoneNumber: "+97439789012",
    company: "Gulf Plumbing Services",
    industry: "Plumbing & Sanitary",
    callDaysAgo: [11],
    signals: {
      decisionMaker: true,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: ["Plumbing fixtures"],
      purchaseTimelineDays: null,
      currentSupplier: "Al-Nasr Plumbing Supplies",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["Long relationship with current supplier", "No reason to change"],
      painPoints: [],
      summary: "Rodrigo runs a plumbing subcontractor with a long-standing supplier relationship and no immediate interest in changing. He was polite but completely uninterested.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — satisfied with current supplier, no interest in switching.",
      transcript: `AI Agent: Good afternoon. Is this Rodrigo Fernandez?

Rodrigo: Yes. What can I do for you?

AI Agent: Good afternoon. Gulf Materials Supply here. We supply plumbing materials and sanitary ware. Are you currently looking for any plumbing materials suppliers?

Rodrigo: No, I'm happy with my supplier. We've been with them for eight years. Very reliable.

AI Agent: That's great. We wouldn't want to disrupt a good relationship. Would you keep us in mind for any future requirements?

Rodrigo: Sure. Thanks.

AI Agent: Thank you, Rodrigo.`,
    },
  },
  {
    name: "Cecilia Bautista",
    phoneNumber: "+97462890123",
    company: "Al-Naimi Steel Trading",
    industry: "Steel Trading",
    callDaysAgo: [7],
    signals: {
      decisionMaker: false,
      activeProjects: false,
      projectStage: "",
      materialsNeeded: [],
      purchaseTimelineDays: null,
      currentSupplier: "",
      openToAlternatives: false,
      requestedQuote: false,
      followUpRequested: false,
      objections: ["They are a competitor — also supplies steel", "Wrong prospect"],
      painPoints: [],
      summary: "Cecilia works at a competing steel trading company. Clearly a wrong number or data error. Not a prospect.",
      followupNeeded: false,
      recommendedFollowupMessage: "N/A — competitor company, not a prospect.",
      transcript: `AI Agent: Good morning. May I speak with Cecilia Bautista?

Cecilia: Yes, this is Cecilia. What is this regarding?

AI Agent: Good morning. Gulf Materials Supply here. We supply construction materials and wanted to see if your company has any requirements.

Cecilia: We are Al-Naimi Steel Trading. We actually supply similar products — we're in the same business.

AI Agent: Oh, I apologize — it looks like this was an incorrect contact. Thank you for letting me know, Cecilia.

Cecilia: No problem. Goodbye.`,
    },
  },
];

// ── main seed logic ───────────────────────────────────────────────────────────

async function main() {
  console.log("Clearing existing seed data…");
  // Delete in FK-safe order
  await prisma.callQueue.deleteMany();
  await prisma.leadAnalysis.deleteMany();
  await prisma.call.deleteMany();
  await prisma.lead.deleteMany();

  console.log(`Seeding ${leads.length} leads…`);

  for (const def of leads) {
    const score = computeScore(def.signals);
    const temp = temperature(score, def.signals);
    const intent = intentLevel(score);

    // Most recent call date
    const lastCallDay = def.callDaysAgo[def.callDaysAgo.length - 1];
    const lastCallDate = daysAgo(lastCallDay, 9 + Math.floor(Math.random() * 6));

    // Determine lead status
    const hasCallbacks = def.callDaysAgo.length > 1;
    const leadStatus: LeadStatus = temp === "cold" && !def.signals.activeProjects
      ? LeadStatus.CALLED
      : temp === "hot"
      ? LeadStatus.COMPLETED
      : LeadStatus.CALLED;

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        phoneNumber: def.phoneNumber,
        name: def.name,
        company: def.company,
        industry: def.industry,
        status: leadStatus,
        lastCallAttempt: lastCallDate,
        callAttempts: def.callDaysAgo.length,
        latestScore: score,
        latestIntent: intent,
        latestStatus: temp,
        createdAt: daysAgo(def.callDaysAgo[0] + 1, 8),
      },
    });

    // Create one call per callDaysAgo entry; analysis only for the latest call
    for (let i = 0; i < def.callDaysAgo.length; i++) {
      const isLatest = i === def.callDaysAgo.length - 1;
      const dayAgo = def.callDaysAgo[i];
      const startHour = 9 + (i % 4) * 2;
      const startedAt = daysAgo(dayAgo, startHour, 15);
      const duration = 90 + Math.floor(Math.random() * 240); // 90–330s
      const endedAt = new Date(startedAt.getTime() + duration * 1000);

      const call = await prisma.call.create({
        data: {
          vapiCallId: `vapi_${randId()}`,
          leadId: lead.id,
          transcript: isLatest ? def.signals.transcript : `[Follow-up call ${i + 1}] ${def.signals.transcript.slice(0, 200)}…`,
          duration,
          recordingUrl: null,
          status: "ended",
          startedAt,
          endedAt,
          createdAt: startedAt,
        },
      });

      // Only create analysis for the latest call (matches idempotency design)
      if (isLatest && def.signals.materialsNeeded.length >= 0) {
        const interested = score >= 40;
        const na = nextAction(temp, def.signals.requestedQuote);

        await prisma.leadAnalysis.create({
          data: {
            callId: call.id,
            leadId: lead.id,
            interested,
            leadScore: score,
            intentLevel: intent,
            summary: def.signals.summary,
            nextAction: na,
            objections: def.signals.objections,
            painPoints: def.signals.painPoints,
            followupNeeded: def.signals.followupNeeded,
            recommendedFollowupMessage: def.signals.recommendedFollowupMessage,
            decisionMaker: def.signals.decisionMaker,
            activeProjects: def.signals.activeProjects,
            projectStage: def.signals.projectStage,
            materialsNeeded: def.signals.materialsNeeded,
            purchaseTimelineDays: def.signals.purchaseTimelineDays,
            currentSupplier: def.signals.currentSupplier,
            openToAlternatives: def.signals.openToAlternatives,
            requestedQuote: def.signals.requestedQuote,
            followUpRequested: def.signals.followUpRequested,
            createdAt: new Date(endedAt.getTime() + 30_000),
          },
        });
      }
    }

    // Add completed queue entries for called leads (shows history in the queue)
    if (hasCallbacks) {
      await prisma.callQueue.create({
        data: {
          leadId: lead.id,
          status: QueueStatus.SUCCESS,
          attempts: def.callDaysAgo.length,
          createdAt: daysAgo(def.callDaysAgo[0] + 1, 8, 30),
          processedAt: lastCallDate,
        },
      });
    }

    process.stdout.write(`  ✓ ${def.name} (${temp}, score: ${score})\n`);
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
