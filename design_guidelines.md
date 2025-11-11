# Aviation Ape Manager - Authentication System Design Guidelines

## Design Approach

**Selected Framework**: Modern Enterprise Authentication
Drawing inspiration from Linear's precision, Stripe's trustworthiness, and Fluent Design's professional clarity. This aviation management system demands credibility and efficiency over creative flair.

**Core Principle**: Professional minimalism with purposeful details that communicate reliability and precision—values critical in aviation.

---

## Typography System

**Font Stack**: 
- Primary: Inter (via Google Fonts CDN) - clean, professional, excellent readability
- Weights: 400 (regular), 500 (medium), 600 (semibold)

**Hierarchy**:
- Page Titles: text-4xl font-semibold (auth page headings)
- Form Labels: text-sm font-medium
- Input Text: text-base font-normal
- Helper Text: text-sm font-normal
- Links: text-sm font-medium

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Micro spacing (form elements): 2, 4
- Component spacing: 6, 8
- Section spacing: 12, 16, 24

**Authentication Layout Structure**:
Full-viewport split layout:
- Left panel (50% width on desktop): Authentication form area
- Right panel (50% width on desktop): Hero image panel
- Mobile: Stack vertically, hero image as header (h-48)

---

## Component Library

### Authentication Container
- Left Panel: max-w-md centered content, px-8 py-12
- Form container: w-full with consistent 6-unit vertical spacing between elements

### Form Elements
**Input Fields**:
- Full-width text inputs with clear labels above
- Height: h-12
- Border radius: rounded-lg
- Border weight: border
- Padding: px-4
- Focus state: prominent border treatment
- Error state: red border with error text below (text-sm)

**Buttons**:
- Primary CTA: Full width, h-12, rounded-lg, font-medium
- Secondary actions: Ghost/text style
- Hover states: subtle elevation change

**Form Structure**:
- Logo placement: Top of form, mb-12
- Heading + subtext: mb-8
- Input groups: space-y-6
- Submit button: mt-8
- Alternative actions: mt-6, center-aligned

### Navigation Elements
**Form Links**:
- "Forgot password?": Right-aligned under password field
- "Don't have an account?" / "Already have an account?": Bottom of form, center-aligned
- Social proof element: Below form ("Trusted by 500+ aviation companies")

### Login Page Specific
- Email/Username field
- Password field with show/hide toggle
- Remember me checkbox (optional, left-aligned)
- Forgot password link
- Sign up redirect

### Register Page Specific
- Full name field
- Email field
- Username field (with availability indicator)
- Password field with strength indicator (visual bar below input)
- Confirm password field
- Terms acceptance checkbox with linked text
- Sign in redirect

---

## Images

**Hero Image Specification**:
- Placement: Right 50% of viewport on desktop, top banner on mobile
- Subject: Professional aviation imagery - modern aircraft on tarmac at golden hour OR sleek aircraft interior OR aerial view of private jets
- Treatment: Subtle gradient overlay (dark to transparent, left to right) to ensure form panel integration
- Dimensions: Cover entire right panel, object-fit: cover, object-position: center
- Quality: High-resolution, professional photography conveying precision and luxury

**Additional Visual Elements**:
- Company logo: Top of left panel, max-width 180px
- Subtle aircraft silhouette pattern as background texture in form panel (very low opacity, non-distracting)

---

## Accessibility & Polish

- All inputs have associated labels (not placeholders as labels)
- Clear focus indicators on all interactive elements
- Error messages appear below relevant fields
- Success states for completed inputs (checkmark icon)
- Password strength indicator for register page (4-segment horizontal bar)
- Loading states for submit buttons (spinner replaces text)
- Keyboard navigation fully supported

---

## Page-Specific Details

**Login Page Elements**:
1. Logo (top-left of form panel)
2. "Welcome back" heading + "Sign in to continue" subtext
3. Email/Username input
4. Password input with toggle visibility icon
5. Forgot password link (right-aligned)
6. Sign in button (primary, full-width)
7. Register redirect ("Don't have an account? Sign up")
8. Trust badge ("Secured & Encrypted" with shield icon)

**Register Page Elements**:
1. Logo (top-left of form panel)
2. "Create your account" heading + "Start managing your fleet" subtext
3. Full name input
4. Email input
5. Username input (with real-time availability check)
6. Password input with strength indicator
7. Confirm password input
8. Terms checkbox ("I agree to Terms of Service and Privacy Policy")
9. Create account button (primary, full-width)
10. Login redirect ("Already have an account? Sign in")
11. Trust badge

Both pages maintain identical right-panel hero imagery for brand consistency.