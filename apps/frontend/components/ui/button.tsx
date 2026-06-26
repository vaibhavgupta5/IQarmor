import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-xs font-semibold font-mono tracking-widest uppercase whitespace-nowrap transition-all duration-300 outline-none select-none focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/50 active:not-aria-[haspopup]:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-purple-600 text-white hover:bg-purple-500",
        outline:
          "border-[#333333] bg-background/50 backdrop-blur-sm hover:border-purple-500 hover:bg-purple-500/10 hover:text-purple-300 text-muted-foreground",
        secondary:
          "bg-[#1A1A1A] text-foreground border border-[#333] hover:border-purple-500/50 hover:bg-[#222] hover:text-purple-300",
        ghost:
          "hover:bg-purple-500/10 hover:text-purple-300 text-muted-foreground transition-all duration-300",
        destructive:
          "bg-red-950/40 border border-red-900/50 text-red-500 hover:bg-red-900/40 hover:text-red-400 hover:border-red-500/50 focus-visible:ring-red-500/40",
        link: "text-purple-400 underline-offset-4 hover:underline hover:text-purple-300",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 ,10px)] px-2 text-xs in-data-[slot=button-group]: has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 ,12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]: has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 ,10px)] in-data-[slot=button-group]: [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 ,12px)] in-data-[slot=button-group]:",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
