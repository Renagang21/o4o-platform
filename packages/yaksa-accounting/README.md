# @o4o/yaksa-accounting

> Digital Cashbook for Yaksa Division/Branch Office Expenses

## Overview

yaksa-accounting is **NOT** an ERP or full accounting system.

It is a **Digital Cashbook (금전출납장)** designed for:
- Recording office expenses (지출 기록)
- Monthly closing (월별 마감)
- Category-based summary (카테고리별 집계)
- Excel/PDF export for General Assembly (총회 보고용)

## Scope Included

- Office Expense Recording (Cashbook)
  - Entertainment / Meeting Expense (접대비/회의비)
  - General & Admin Expense (일반관리비)
  - Supplies / Misc Expense (소모품/잡비)
  - Officer Business Expense (임원 업무비)
- Monthly Lock (No Edit after Closing)
- Category-based Summary (1 Depth)
- Excel / PDF Export for General Assembly

## Scope Excluded (DO NOT IMPLEMENT)

- Double Entry / Debit-Credit (복식부기)
- Account Code Tree (계정과목 트리)
- Budget Planning / Control (예산 관리)
- Income Management / Membership Fee (수입/회비 관리)
- Tax / Payroll / Withholding (세무/급여/원천세)
- Electronic Approval Workflow (전자결재)
- Bank / Card Auto Sync (은행/카드 연동)

## Dependencies

- `@o4o/organization-core` - Organization structure
- `@o4o/membership-yaksa` - Member info reference
- `@o4o/annualfee-yaksa` - Income reference (READ ONLY)
- `@o4o/yaksa-admin` - Admin integration
