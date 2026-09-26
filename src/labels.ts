import { Bus, CarTaxiFront, Clock, Footprints, Heading, MapPin, Plane, Route, Ship, TrainFront, TramFront, type LucideIcon } from 'lucide-react'
import type { Kind, Mode } from './types'

export const KINDS: { id: Kind; label: string; icon: LucideIcon }[] = [
  { id: 'event', label: 'שעה', icon: Clock },
  { id: 'place', label: 'מקום', icon: MapPin },
  { id: 'travel', label: 'נסיעה', icon: Route },
  { id: 'divider', label: 'כותרת', icon: Heading },
]

export const MODES: { id: Mode; label: string; icon: LucideIcon }[] = [
  { id: 'walk', label: 'הליכה', icon: Footprints },
  { id: 'tube', label: 'טיוב', icon: TramFront },
  { id: 'train', label: 'רכבת', icon: TrainFront },
  { id: 'bus', label: 'אוטובוס', icon: Bus },
  { id: 'boat', label: 'שיט', icon: Ship },
  { id: 'taxi', label: 'מונית', icon: CarTaxiFront },
  { id: 'flight', label: 'טיסה', icon: Plane },
]
export const modeIcon = (m?: Mode) => MODES.find(x => x.id === m)?.icon ?? Route

export const REMINDERS: { v: number | undefined; label: string }[] = [
  { v: undefined, label: 'ללא' },
  { v: 0, label: 'בזמן' },
  { v: 10, label: '10 דק׳' },
  { v: 15, label: '15 דק׳' },
  { v: 30, label: '30 דק׳' },
  { v: 45, label: '45 דק׳' },
  { v: 60, label: 'שעה' },
  { v: 120, label: 'שעתיים' },
]
