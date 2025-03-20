"use client"
import Image from "next/image"
import { Linkedin, Twitter, Mail, ChevronLeft, ChevronRight, Send } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const projects = [
  {
    title: "PAVEL",
    description: "Pipeline Analytics & Visualization for Execution Logs",
    content:
      "PAVEL is a tool designed to visualize and analyze data pipeline executions. It provides interactive timelines, critical path analysis, and insights into your data workflows.",
    link: "/pavel",
    linkText: "Explore PAVEL →",
  },
  {
    title: "Future Project",
    description: "Coming Soon",
    content: "Stay tuned for more exciting projects in the data analytics space.",
    link: null,
    linkText: null,
  },
]

function useAge(birthDate: Date) {
  const [age, setAge] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const diff = now.getTime() - birthDate.getTime()

      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
      const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setAge(`${years}y ${days}d ${hours}h ${minutes}m ${seconds}s`)
    }, 1000)

    return () => clearInterval(interval)
  }, [birthDate])

  return age
}

export default function HomePage() {
  const [currentProject, setCurrentProject] = useState(0)
  const age = useAge(new Date("1995-07-13T07:30:00"))
  const router = useRouter()

  const handleProjectLink = (link: string) => {
    router.push(link, { scroll: true })
  }

  const nextProject = () => {
    setCurrentProject((prev) => (prev + 1) % projects.length)
  }

  const prevProject = () => {
    setCurrentProject((prev) => (prev - 1 + projects.length) % projects.length)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex space-x-8">
                <a
                  href="#about"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  About
                </a>
                <a
                  href="#projects"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  Projects
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="p-10 max-w-4xl mx-auto">
        <section className="mb-16 flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_20250201_224557_366.jpg-cG4RSqashn0DI60YokGP0UJ0aY4Ge1.jpeg"
              alt="Pavel Sivash"
              fill
              className="rounded-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Pavel Sivash</h1>
            <p className="text-gray-600 mb-2">
              <span className="mr-2">🕵️</span>
              <span className="font-mono text-sm text-gray-800">Data Alchemist | Data Detective | Data Consultant</span>
            </p>
            <p className="text-gray-600 mb-2">
              <span className="mr-2">📍</span>
              <span className="font-mono text-sm text-gray-800">Helsinki, Finland</span>
            </p>
            <p className="text-gray-600 flex items-center mb-2">
              <span className="mr-2">⏳</span>
              <span className="font-mono text-sm bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text animate-pulse">
                {age}
              </span>
            </p>
          </div>
        </section>

        <section id="about" className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">About Me</h2>
          <div className="bg-white shadow-md rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              Hello, I'm Pavel, a Data Enthusiast with over 9 years of experience in the field. My expertise lies in
              transforming complex data into actionable insights that drive business decisions.
            </p>
            <p className="text-gray-700 mb-4">
              Throughout my career, I've specialized in Data Warehousing, Product Analytics, and Business Intelligence.
              My toolkit includes SQL, Python, dbt, and various BI tools, which I use to build robust data
              infrastructures and derive meaningful insights.
            </p>
            <p className="text-gray-700">
              I'm passionate about data governance, process automation, and finding innovative ways to make data more
              accessible and impactful. I'm always eager to tackle new challenges and explore how data can be leveraged
              to drive business growth.
            </p>
          </div>
        </section>

        <section id="projects" className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Projects</h2>
          <div className="bg-white shadow-md rounded-lg p-6 relative">
            <button
              onClick={prevProject}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-200 rounded-full p-2 hover:bg-gray-300"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextProject}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-200 rounded-full p-2 hover:bg-gray-300"
            >
              <ChevronRight size={24} />
            </button>
            <div className="px-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{projects[currentProject].title}</h3>
              <p className="text-gray-700 mb-4">{projects[currentProject].description}</p>
              <p className="text-gray-600 mb-4">{projects[currentProject].content}</p>
              {projects[currentProject].link && (
                <button
                  onClick={() => handleProjectLink(projects[currentProject].link!)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {projects[currentProject].linkText}
                </button>
              )}
            </div>
          </div>
        </section>

        <section id="contact" className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Let's Connect</h2>
          <div className="bg-white shadow-md rounded-lg p-6">
            <p className="text-gray-700 mb-6">
              Interested in discussing data strategies, analytics engineering, or innovative ways to make your data work
              harder? I'm always open to new connections and exciting projects.
            </p>
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-4">
                <a
                  href="https://www.linkedin.com/in/pasivash/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-black"
                >
                  <Linkedin size={20} />
                </a>
                <a
                  href="https://x.com/pasivash"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-black"
                >
                  <Twitter size={20} />
                </a>
                <a href="mailto:pasivash@gmail.com" className="text-gray-600 hover:text-black">
                  <Mail size={20} />
                </a>
                <a
                  href="https://t.me/psivash"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-black"
                >
                  <Send size={20} />
                </a>
              </div>
              <a
                href="https://www.buymeacoffee.com/pasivash"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-center text-black bg-[#FFDD00] rounded-md hover:bg-[#FFDD00]/90 focus:ring-2 focus:outline-none focus:ring-[#FFDD00]/50"
                style={{ height: "24px", width: "auto" }}
              >
                <Image
                  src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
                  alt="Buy me a coffee"
                  width={12}
                  height={12}
                  className="mr-1"
                />
                <span>Buy me a coffee</span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

