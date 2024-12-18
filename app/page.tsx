"use client"

import Image from "next/image"
import ruleImg from "../public/rule.png"
import { MouseEventHandler, useState } from "react"

type AppState = "IDLE" | "READY" | "TESTING"

const TEMPO = 128 // M.M.
const TEMPO_MS = (60 / TEMPO) * 1000
const BEATS_PER_BAR = 4
const NUM_TRIALS = 4

class CountInTimer {
  gainNode: GainNode

  constructor() {
    const audioCtx = new AudioContext()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.frequency.value = 440
    gainNode.gain.value = 0
    oscillator.connect(gainNode).connect(oscillator.context.destination)
    oscillator.start()

    this.gainNode = gainNode
  }

  run() {
    this.#beep()
    let n = 1
    const intervalId = setInterval(() => {
      if (n === BEATS_PER_BAR) {
        return clearInterval(intervalId)
      }
      n += 1
      this.#beep()
    }, TEMPO_MS)
  }

  #beep() {
    this.gainNode.gain.value = 1
    setTimeout(() => {
      this.gainNode.gain.value = 0
    }, 50)
  }
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("IDLE")
  const [times, setTimes] = useState<number[]>([])

  if (times.length === NUM_TRIALS) {
    showResults()
  }

  function handleTouch() {
    if (appState === "IDLE") {
      setAppState("READY")
      const timer = new CountInTimer()
      setTimeout(() => {
        timer.run()
        setAppState("TESTING")
      }, 2000)
      return
    }
    if (appState === "TESTING") {
      setTimes([...times, performance.now()])
    }
  }

  function showResults() {
    let lines: string[] = []
    let diffSum = 0
    for (let i = 1; i < times.length; i += 1) {
      const diffMs = Math.round(
        times[i] - times[i - 1] - BEATS_PER_BAR * TEMPO_MS,
      )
      lines = [
        ...lines,
        `${i}~${i + 1}: ${Math.abs(diffMs)}ms ${diffMs > 0 ? "長い" : diffMs < 0 ? "短い" : "ピッタリ"}`,
      ]
      diffSum += Math.abs(diffMs)
    }

    const text = `今日のテンポ: BPM ${TEMPO}\n${lines.join("\n")}\n誤差合計: ${diffSum}ms`
    const url = window.location.href.split("?")[0]
    const hashtags = "テンポをキープするやつ"

    const usp = new URLSearchParams()
    usp.set("text", text)
    usp.set("url", url)
    usp.set("hashtags", hashtags)

    window.location.href = `https://twitter.com/intent/tweet?${usp}`
  }

  return (
    <UI appState={appState} numTouches={times.length} onTouch={handleTouch} />
  )
}

type UIProps = {
  appState: AppState
  numTouches: number
  onTouch: MouseEventHandler
}

function UI({ appState, numTouches, onTouch }: UIProps) {
  return (
    <div className="h-screen" onMouseDownCapture={onTouch}>
      <h1 className="p-10 text-2xl text-center">テンポをキープするやつ！</h1>
      <figure>
        <figcaption className="pb-1 text-center">ルール</figcaption>
        <Image
          src={ruleImg}
          alt="ルール：始めに4拍ビープ音が鳴るので、それと同じテンポで1拍目だけ画面をタップする動作を4小節繰り返してください。"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </figure>
      <div className="p-10">
        <p className="text-center">今日のテンポ</p>
        <p className="text-center text-lg">BPM {TEMPO}</p>
      </div>
      <div>
        {appState === "IDLE" ? (
          <>
            <p className="text-center text-lg">画面タップでスタート</p>
            <p className="text-center text-xs">
              ※消音モードをオフにしてください
            </p>
          </>
        ) : appState === "READY" ? (
          <p className="text-center text-lg">READY?</p>
        ) : numTouches > 0 ? (
          <>
            <p className="text-center">{numTouches}</p>
            {numTouches === NUM_TRIALS ? (
              <p className="text-center">画面リロードで再テスト</p>
            ) : (
              <></>
            )}
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  )
}
