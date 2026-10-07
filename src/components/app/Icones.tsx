import {
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  CreditCard,
  Droplets,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  House,
  Landmark,
  Laptop,
  Lightbulb,
  Music,
  PawPrint,
  Phone,
  PiggyBank,
  Pill,
  Plane,
  Plus,
  Repeat,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Target,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { TipoConta } from '@/features/financas/tipos'

/** Ícones que uma categoria ou meta pode usar (o banco guarda só a chave). */
export const ICONES: Record<string, LucideIcon> = {
  tag: Tag,
  utensils: Utensils,
  cart: ShoppingCart,
  coffee: Coffee,
  home: House,
  car: Car,
  bus: Bus,
  fuel: Fuel,
  gamepad: Gamepad2,
  film: Film,
  music: Music,
  heart: Heart,
  pill: Pill,
  dumbbell: Dumbbell,
  book: BookOpen,
  graduation: GraduationCap,
  bag: ShoppingBag,
  shirt: Shirt,
  gift: Gift,
  repeat: Repeat,
  wifi: Wifi,
  phone: Phone,
  zap: Zap,
  droplets: Droplets,
  lightbulb: Lightbulb,
  wrench: Wrench,
  paw: PawPrint,
  briefcase: Briefcase,
  laptop: Laptop,
  trending: TrendingUp,
  plus: Plus,
  banknote: Banknote,
  shield: Shield,
  plane: Plane,
  target: Target,
  piggy: PiggyBank,
}

export const ICONE_DA_CONTA: Record<TipoConta, LucideIcon> = {
  corrente: Landmark,
  dinheiro: Banknote,
  poupanca: PiggyBank,
  carteira: Wallet,
  investimento: TrendingUp,
}

export const IconeCartao = CreditCard

export function IconeCategoria({
  icone,
  cor,
  tamanho = 18,
  className = '',
}: {
  icone: string
  cor: string
  tamanho?: number
  className?: string
}) {
  const I = ICONES[icone] ?? Tag
  return (
    <span
      className={`icone-cat ${className}`}
      style={{ ['--c' as string]: cor }}
      aria-hidden="true"
    >
      <I size={tamanho} />
    </span>
  )
}
