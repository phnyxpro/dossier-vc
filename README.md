# Dossier by Ventureble

Build a responsive web application prototype called "Dossier by Ventureble".

Dossier is an AI-assisted capital-readiness and lender-pack preparation tool for Caribbean MSMEs. It helps a business organize fragmented financing information, identify missing information and readiness issues, and generate a structured financing dossier that can be shared with banks, credit unions, DFIs and other capital providers.

For this first prototype, create a polished clickable front-end using realistic sample data. Do not connect external APIs yet.

The application should have these main areas:

1. Dashboard

Show existing financing requests, their status, amount sought, financing purpose, readiness status and last updated date.

Include a clear button to start a new financing request.

2. New Financing Request

Collect:

- Company name

- Country

- Industry

- Years in operation

- Revenue

- Financing amount sought

- Currency

- Purpose of financing

- Desired financing term

- Existing debt

- Proposed security or collateral

- Brief explanation of how the financing will be repaid

3. Documents

Allow the user to upload or simulate uploading:

- Financial statements

- Management accounts

- Bank statements

- Accounts receivable ageing

- Accounts payable ageing

- Contracts

- Invoices

- Tax documents

- Business registration documents

- Collateral or security documents

Show each document as Received, Missing or Needs Review.

4. AI Extraction Review

Show key information extracted from uploaded documents, including revenue, EBITDA or operating profit where available, cash balance, existing debt, receivables, major customers and recurring obligations.

Every extracted field must show its source document and allow the user to confirm or correct the information before it is used.

5. Capital Readiness Review

Create a structured review showing:

- Financial snapshot

- Use of funds

- Repayment support

- Cash-flow indicators

- Existing debt

- Security or collateral

- Missing documents

- Key risk flags

- Questions a lender is likely to ask

- Recommended next steps

Do not provide an automated credit approval, loan recommendation or investment decision.

6. Dossier Output

Create a professional lender-ready preview containing:

- Borrower profile

- Financing request

- Use of funds

- Business overview

- Financial snapshot

- Repayment support

- Cash-flow indicators

- Existing debt

- Security or collateral summary

- Key risks

- Missing information

- Lender questions

- Recommended next steps

Include an Export Dossier button, although the export can be simulated in this first version.

7. Capital Provider Review View

Create a concise dashboard that allows a lender or other capital provider to quickly review:

- Amount requested

- Purpose

- Financial snapshot

- Repayment support

- Risk flags

- Missing documents

- Key questions

Use realistic Caribbean business sample data denominated in TTD for the demonstration company.

Design:

Use a premium financial technology aesthetic. Dark navy background, restrained teal and warm gold accents, strong typography, clean cards and data tables. The product should look credible enough for a bank, DFI or business owner to use.

Keep the navigation simple and the workflow obvious:

Dashboard > Financing Request > Documents > Extraction Review > Readiness Review > Dossier

Label the product prominently as:

DOSSIER

by Ventureble

We are cloning https://75c08dd4-27df-4d59-bc06-5f143b830074.preview.shogo.ai/?section=dashboard the build from shogo.ai to build in loveable. Open AI/Chat GPT is needed from AI extraction/parsing of each document as described in documents.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dossier-vc.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0a205a91-e270-463a-a4e5-9f57894e3fcd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
