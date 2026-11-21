import React from 'react';
import {
  BookOpen,
  Briefcase,
  Bus,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  MoreHorizontal,
  PlusCircle,
  Receipt,
  Shirt,
  ShoppingBag,
  Tag,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';

interface CategoryIconProps {
  iconName: string;
  color?: string;
  className?: string;
}

export function CategoryIcon({ iconName, color = '#047857', className = 'h-5 w-5' }: CategoryIconProps) {
  const props = { className, style: { color }, 'aria-hidden': true as const };

  switch (iconName) {
    case 'Utensils':
      return <Utensils {...props} />;
    case 'Bus':
      return <Bus {...props} />;
    case 'Home':
      return <Home {...props} />;
    case 'Shirt':
      return <Shirt {...props} />;
    case 'BookOpen':
      return <BookOpen {...props} />;
    case 'HeartPulse':
      return <HeartPulse {...props} />;
    case 'Gamepad2':
      return <Gamepad2 {...props} />;
    case 'ShoppingBag':
      return <ShoppingBag {...props} />;
    case 'Receipt':
      return <Receipt {...props} />;
    case 'MoreHorizontal':
      return <MoreHorizontal {...props} />;
    case 'Wallet':
      return <Wallet {...props} />;
    case 'Users':
      return <Users {...props} />;
    case 'GraduationCap':
      return <GraduationCap {...props} />;
    case 'Briefcase':
      return <Briefcase {...props} />;
    case 'Gift':
      return <Gift {...props} />;
    case 'PlusCircle':
      return <PlusCircle {...props} />;
    default:
      return <Tag {...props} />;
  }
}
