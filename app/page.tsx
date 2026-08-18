import { redirect } from 'next/navigation'

export default function HomePage() {
  // Immediately redirect anyone hitting the root domain to the login page
  redirect('/login')
}