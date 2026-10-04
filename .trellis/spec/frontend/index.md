# Frontend Development Guidelines

> Source-backed conventions for the responsive React Web application.

---

## Overview

The frontend uses React 19, TypeScript, Vite, TanStack Router/Query, Tailwind,
and existing Radix/Lucide components. Phone interactions and desktop management
share one Web application. These guidelines describe current source patterns.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Routes, feature pages, shared components and generated API code | Documented |
| [Experience Design](./experience-design.md) | Standing award-quality ambition, journal identity, shared mental model and eight-dimension review | Documented |
| [Component Guidelines](./component-guidelines.md) | Typed props, composition, forms and accessible feedback | Documented |
| [Hook Guidelines](./hook-guidelines.md) | Session/query hooks and completion mutation boundaries | Documented |
| [State Management](./state-management.md) | Query cache, URL search, form state and guest intent | Documented |
| [Quality Guidelines](./quality-guidelines.md) | Type/build/format checks and browser verification | Documented |
| [Type Safety](./type-safety.md) | Generated contracts, strict TypeScript and unknown inputs | Documented |
| [Runtime and Development Checks](../product/runtime-and-data.md) | Preview setup, development commands and OpenAPI client generation | Documented |

---

## Pre-Development Checklist

Read directory structure and quality guidance before frontend changes. Every
user-facing UI task also reads experience-design.md and explicitly registers
it in both implement/check context; a link in this index is not loaded context.
Select the component, hook, state and type documents for the affected code; read the
backend contract for API behavior. UI work also reads Trellis Plus frontend and
validation profiles; preview operations read runtime/data and preview policies.

## Quality Check

Use quality-guidelines.md for existing package scripts and browser coverage.
Verify generated API types, query invalidation and desktop/phone interaction
behavior for the affected flow. Documentation changes must retain real source
references, working links, and no template scaffolding.

---

**Language**: All documentation should be written in **English**.
