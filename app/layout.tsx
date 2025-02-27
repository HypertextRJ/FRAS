import "./globals.css"
import { Inter } from "next/font/google"
import type React from "react"
import { Toaster } from "@/components/ui/toaster"
import LogoutButton from "./components/LogoutButton"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "InFace",
  description: "Login and signup system for NIT Mizoram students, teachers, and admins",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <img
                    src="https://i.ibb.co/0pJsBkqQ/nitlogo.png"
                    alt="NIT Mizoram Logo"
                    className="h-10 w-auto mr-4"
                  />
                  <h1 className="text-2xl font-bold text-blue-800">InFace</h1>
                </div>
                <nav className="hidden md:flex space-x-4 items-center">
                  <LogoutButton />
                </nav>
                <div className="flex md:hidden items-center space-x-2">
                  <LogoutButton />
                </div>
              </div>
            </div>
          </header>
          <main className="flex-grow">{children}</main>
          <div className="fixed top-0 right-0 z-50">
            <Toaster />
          </div>
          <footer className="bg-white shadow-sm mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="text-sm text-gray-500 mb-4 md:mb-0">
                  &copy; {new Date().getFullYear()} InFace. All rights reserved.
                </div>
                <div className="flex flex-wrap justify-center md:justify-end space-x-4">
                <a href="/dashboard" className="text-sm text-gray-600 hover:text-blue-800">
                    Home
                  </a>
                  <a href="/contact" className="text-sm text-gray-600 hover:text-blue-800">
                    Contact Us
                  </a>
                  <a href="https://www.nitmz.ac.in/" className="text-sm text-gray-600 hover:text-blue-800">
                    Official
                  </a>
                  <a href="https://erp.nitmz.ac.in/iitmsv4eGq0RuNHb0G5WbhLmTKLmTO7YBcJ4RHuXxCNPvuIw=?enc=EGbCGWnlHNJ/WdgJnKH8DA==" className="text-sm text-gray-600 hover:text-blue-800">
                    ERP
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}

