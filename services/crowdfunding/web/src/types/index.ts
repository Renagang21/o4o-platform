export interface User {
  id: string
  name: string
  email: string
  role: 'backer' | 'creator' | 'partner'
  avatar?: string
}

export interface Project {
  id: string
  title: string
  subtitle: string
  description: string
  category: string
  creator: User
  targetAmount: number
  currentAmount: number
  backerCount: number
  startDate: string
  endDate: string
  status: 'preparing' | 'active' | 'success' | 'failed' | 'delivered'
  mainImage: string
  images: string[]
  video?: string
  rewards: Reward[]
  updates: Update[]
  comments: Comment[]
  transparencyScore: number
  partnerEndorsements: PartnerEndorsement[]
}

export interface Reward {
  id: string
  title: string
  description: string
  price: number
  deliveryDate: string
  limit?: number
  claimed: number
  items: string[]
  shippingInfo?: string
}

export interface Update {
  id: string
  title: string
  content: string
  createdAt: string
  author: User
}

export interface Comment {
  id: string
  content: string
  createdAt: string
  author: User
  replies?: Comment[]
}

export interface PartnerEndorsement {
  id: string
  partner: Partner
  reason: string
  commission: number
  createdAt: string
}

export interface Partner {
  id: string
  name: string
  specialty: string
  followers: number
  rating: number
  tier: 'gold' | 'silver' | 'bronze'
}

export interface Backing {
  id: string
  project: Project
  backer: User
  reward: Reward
  amount: number
  backedAt: string
  status: 'pending' | 'completed' | 'refunded'
  rewardChoice?: 'product' | 'refund' // 보상 선택 시스템
}