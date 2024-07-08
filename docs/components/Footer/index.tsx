import { useEffect } from "react"
import { useRouter } from "next/router"
import { clsx } from 'clsx';

function kFormatter(num: number) {
  return (Math.sign(num) * (Math.abs(num) / 1000)).toFixed(1) + "k"
}

export function Footer({ className = "" }) {
  const router = useRouter()

  useEffect(() => {
    fetch("https://api.github.com/repos/nextauthjs/next-auth")
      .then((res) => res.json())
      .then((data) => {
        const githubStat = document.querySelector(".github-counter")!
        if (!githubStat) return
        githubStat.innerHTML = kFormatter(data.stargazers_count ?? 21100)
      })

    // CarbonAds hydration error workaround hack
    const carbonAdsEl =
      document.querySelector<HTMLScriptElement>("#_carbonads_js")
    if (carbonAdsEl) {
      carbonAdsEl.src =
        "https://cdn.carbonads.com/carbon.js?serve=CWYD42JY&placement=authjsdev&format=cover"

      router.events.on("routeChangeComplete", () => {
        window._carbonads?.refresh()
      })
    }
  }, [])
  return (
    <div
      className={clsx(
        "flex flex-col sm:gap-12 gap-4 px-12 items-center pb-20 pt-24 mx-auto w-full text-gray-600 dark:text-gray-100",
        className
      )}
    >
      <div className="flex flex-col gap-6 justify-between w-full sm:flex-row sm:gap-0 max-w-[90rem]">
        <div className="flex flex-col">
          <h3 className="mb-4 text-lg font-black">About NestJS tRPC</h3>
          <ul className="flex flex-col gap-2">
            <li>
              <a href="/introduction">Introduction</a>
            </li>
            <li>
              <a href="/security">Security</a>
            </li>
          </ul>
        </div>
        <div className="flex flex-col">
          <h3 className="mb-4 text-lg font-black">Download</h3>
          <ul className="flex flex-col gap-2">
            <a
              rel="noopener noreferrer"
              target="_blank"
              href="https://github.com/nextauthjs/next-auth"
            >
              GitHub
            </a>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href="https://www.npmjs.com/package/next-auth"
            >
              NPM
            </a>
          </ul>
        </div>
        <div className="flex flex-col">
          <h3 className="mb-4 text-lg font-black">Acknowledgements</h3>
          <ul className="flex flex-col gap-2">
            <a href="/contributors">Contributors</a>
            <a href="/sponsors">Sponsors</a>
          </ul>
        </div>
      </div>
      <div className="flex-grow mx-auto mt-4 text-gray-400 sm:mt-0 dark:text-gray-500">
        NestJS tRPC &copy; Kevin Edry and Team - {new Date().getFullYear()}
      </div>
    </div>
  )
}

export default Footer