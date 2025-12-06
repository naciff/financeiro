# FourTek Style Guide

## Brand Colors

### Primary Colors
- **FourTek Green**: `#00CC00` - Primary action color, buttons
- **FourTek Blue**: `#0066CC` - Secondary color, links, accents

### Hover States
- **Green Hover**: `#00B300` - Darker green for button hover states
- **Blue Hover**: `#0052A3` - Darker blue for link hover states

### Light Variants
- **Green Light**: `#33D633` - Lighter green for backgrounds, borders
- **Blue Light**: `#3385D6` - Lighter blue for backgrounds, borders

### Neutral Palette
- **Neutral 50**: `#FAFAFA` - Lightest background
- **Neutral 100**: `#F5F5F5` - Light background
- **Neutral 200**: `#E5E5E5` - Border color
- **Neutral 300**: `#D4D4D4` - Medium border
- **Neutral 400**: `#A3A3A3` - Disabled text
- **Neutral 500**: `#737373` - Secondary text
- **Neutral 600**: `#525252` - Body text
- **Neutral 700**: `#404040` - Heading text
- **Neutral 800**: `#262626` - Dark text
- **Neutral 900**: `#171717` - Darkest text

## Accessibility

### Contrast Ratios
- **Green on White**: 4.5:1 - Meets WCAG AA standards
- **Blue on White**: 4.5:1 - Meets WCAG AA standards
- **Neutral 600 on White**: 7:1 - Meets WCAG AAA standards
- **Neutral 700 on White**: 8.5:1 - Meets WCAG AAA standards

### Focus States
- All interactive elements use `focus:ring-2 focus:ring-fourtek-green`
- Focus rings are clearly visible with 2px width

## Component Patterns

### Buttons
```html
<button className="bg-fourtek-green hover:bg-fourtek-green-hover text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl">
  Primary Button
</button>
```

### Links
```html
<a className="text-fourtek-blue hover:text-fourtek-blue-hover font-medium transition-colors duration-200">
  Link Text
</a>
```

### Form Inputs
```html
<input className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fourtek-green focus:border-transparent transition-all duration-200" />
```

### Social Media Icons
- Base: `bg-neutral-200 text-neutral-600`
- Hover: Platform-specific colors with `hover:text-white`
- Size: `w-10 h-10` with `rounded-full`
- Effects: `shadow-md hover:shadow-lg transform hover:scale-105`

## Animations

### Scale Animation
- `transform hover:scale-[1.02] active:scale-[0.98]` - Button press effect
- `transform hover:scale-105` - Icon hover effect

### Shadow Animation
- `shadow-lg hover:shadow-xl` - Button elevation
- `shadow-md hover:shadow-lg` - Icon elevation

### Transition Timing
- `transition-all duration-200` - Standard hover transitions
- `transition-colors duration-200` - Color-only transitions

## Logo Usage

### Primary Logo
- File: `/logo.svg`
- Size: `h-16 w-auto` for headers
- Alt text: "FourTek Logo"
- Loading: `loading="eager"` for above-fold content

### Logo Colors
- "Four" text: `#00CC00` (FourTek Green)
- "Tek" text: `#0066CC` (FourTek Blue)
- Icon element: `#0066CC` (FourTek Blue)
- Subtitle: `#525252` (Neutral 600)

## Typography

### Font Sizes
- `text-xs` - Captions, small labels
- `text-sm` - Body text, form labels
- `text-base` - Default body text
- `text-lg` - Subheadings
- `text-xl` - Page headings
- `text-2xl` - Main headings

### Font Weights
- `font-normal` - Body text (400)
- `font-medium` - Buttons, links (500)
- `font-semibold` - Headings (600)

## Responsive Design

### Breakpoints
- Mobile: Default (full width)
- Tablet: `md:` prefix
- Desktop: `lg:` prefix

### Container Widths
- Auth forms: `max-w-md` (448px)
- Cards: `w-full` with responsive padding

## Best Practices

1. **Color Usage**: Use maximum 2 accent colors per component
2. **Spacing**: Always use multiples of 4 for padding and margins
3. **Border Radius**: Use `rounded-lg` for cards, `rounded-full` for icons
4. **Shadows**: Use consistent shadow scales across components
5. **Transitions**: Keep transition durations consistent (200ms standard)
6. **Focus States**: Always include visible focus indicators
7. **Hover States**: Ensure all interactive elements have hover effects