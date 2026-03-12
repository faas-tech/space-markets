import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			'background-elevated': 'hsl(var(--background-elevated))',
  			'background-surface': 'hsl(var(--background-surface))',
  			'background-hover': 'hsl(var(--background-hover))',
  			'background-active': 'hsl(var(--background-active))',
  			foreground: 'hsl(var(--foreground))',
  			'foreground-secondary': 'hsl(var(--foreground-secondary))',
  			'foreground-muted': 'hsl(var(--foreground-muted))',
  			'foreground-dim': 'hsl(var(--foreground-dim))',
  			card: 'hsl(var(--card))',
  			'card-foreground': 'hsl(var(--card-foreground))',
  			'card-hover': 'hsl(var(--card-hover))',
  			'card-border': 'hsl(var(--card-border))',
  			popover: 'hsl(var(--popover))',
  			'popover-foreground': 'hsl(var(--popover-foreground))',
  			primary: 'hsl(var(--primary))',
  			'primary-foreground': 'hsl(var(--primary-foreground))',
  			'primary-glow': 'hsl(var(--primary-glow))',
  			'primary-soft': 'hsl(var(--primary-soft))',
  			secondary: 'hsl(var(--secondary))',
  			'secondary-foreground': 'hsl(var(--secondary-foreground))',
  			muted: 'hsl(var(--muted))',
  			'muted-foreground': 'hsl(var(--muted-foreground))',
  			accent: 'hsl(var(--accent))',
  			'accent-foreground': 'hsl(var(--accent-foreground))',
  			'accent-glow': 'hsl(var(--accent-glow))',
  			'accent-soft': 'hsl(var(--accent-soft))',
  			tertiary: 'hsl(var(--tertiary))',
  			'tertiary-glow': 'hsl(var(--tertiary-glow))',
  			'tertiary-soft': 'hsl(var(--tertiary-soft))',
  			success: 'hsl(var(--success))',
  			'success-foreground': 'hsl(var(--success-foreground))',
  			'success-soft': 'hsl(var(--success-soft))',
  			warning: 'hsl(var(--warning))',
  			'warning-foreground': 'hsl(var(--warning-foreground))',
  			'warning-soft': 'hsl(var(--warning-soft))',
  			destructive: 'hsl(var(--destructive))',
  			'destructive-foreground': 'hsl(var(--destructive-foreground))',
  			'destructive-soft': 'hsl(var(--destructive-soft))',
  			border: 'hsl(var(--border))',
  			'border-hover': 'hsl(var(--border-hover))',
  			'border-accent': 'hsl(var(--border-accent))',
  			input: 'hsl(var(--input))',
  			'input-focus': 'hsl(var(--input-focus))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))',
  				'6': 'hsl(var(--chart-6))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		transitionDuration: {
  			'250': '250ms',
  			'300': '300ms'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

