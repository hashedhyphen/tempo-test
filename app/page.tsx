"use client"

import Image from "next/image"
import ruleImg from "../public/rule.png"
import { MouseEventHandler, useState } from "react"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { ToggleButton, ToggleButtonGroup } from "@mui/material"
import Slider from "@mui/material/Slider"

type AppState = "IDLE" | "READY" | "TESTING"
type AppMode = "TEST" | "TRAINING"

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
})

const TODAY_TEMPO = (() => {
  const d = new Date()
  const s = `${d.getFullYear()}${d.getMonth().toString().padStart(2, "0")}${d.getDate() + 6}`
  const n = parseInt(s, 10)
  const [min, max] = [50, 180]
  // TODO: 疑似乱数アルゴリズム
  return ((max * (n * n)) % (max - min + 1)) + min
})()

const BEATS_PER_BAR = 4
const NUM_TRIALS = 4

function tempoToMs(tempo: number): number {
  return (60 / tempo) * 1000
}
function msToTempo(ms: number): number {
  return (1000 / ms) * 60
}

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

  run(tempo: number) {
    console.log(tempo)
    this.#beep()
    let n = 1
    const intervalId = setInterval(() => {
      if (n === BEATS_PER_BAR) {
        return clearInterval(intervalId)
      }
      n += 1
      this.#beep()
    }, tempoToMs(tempo))
  }

  #beep() {
    this.gainNode.gain.value = 1
    setTimeout(() => {
      this.gainNode.gain.value = 0
    }, 50)
  }
}

function buildResults(tempo: number, times: number[]): string[] {
  let lines: string[] = []
  let diffSum = 0
  for (let i = 1; i < times.length; i += 1) {
    const duration = times[i] - times[i - 1]

    const diffMs = Math.round(duration - BEATS_PER_BAR * tempoToMs(tempo))
    const diffMsText = `${Math.abs(diffMs)}ms ${diffMs > 0 ? "長い" : diffMs < 0 ? "短い" : "ピッタリ"}`

    const diffTempo = Math.round(msToTempo(duration / BEATS_PER_BAR) - tempo)
    const diffTempoText = `BPM ${diffTempo > 0 ? "+" : diffTempo < 0 ? "-" : "±"}${Math.abs(diffTempo)}`

    lines = [...lines, `${i}~${i + 1}: ${diffMsText} (${diffTempoText})`]
    diffSum += Math.abs(diffMs)
  }
  return [...lines, `誤差合計: ${diffSum}ms`]
}

function tweetResults(tempo: number, times: number[]) {
  const text = `今日のテンポ: BPM ${tempo}\n${buildResults(tempo, times).join("\n")}`
  const url = window.location.href.split("?")[0]
  const hashtags = "テンポをキープするやつ"

  const usp = new URLSearchParams()
  usp.set("text", text)
  usp.set("url", url)
  usp.set("hashtags", hashtags)

  window.location.href = `https://twitter.com/intent/tweet?${usp}`
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("IDLE")
  const [appMode, setAppMode] = useState<AppMode>("TEST")
  const [tempo, setTempo] = useState<number>(TODAY_TEMPO) // M.M.
  const [times, setTimes] = useState<number[]>([])
  const [trainingResults, setTrainingResults] = useState<string[]>([])

  function handleChangeAppMode(val: AppMode | null) {
    if (val === null) {
      return
    }
    if (val === "TEST") {
      setTempo(TODAY_TEMPO)
    }
    setAppMode(val)
  }

  function handleTouch() {
    if (appState === "IDLE") {
      setAppState("READY")
      const timer = new CountInTimer()
      setTimeout(() => {
        timer.run(tempo)
        setAppState("TESTING")
      }, 2000)
      return
    }
    if (appState === "TESTING") {
      setTimes([...times, performance.now()])
    }
  }

  if (times.length === NUM_TRIALS) {
    if (appMode === "TEST") {
      tweetResults(tempo, times)
      return
    }
    if (appMode === "TRAINING") {
      setTrainingResults(buildResults(tempo, times))
      setTimes([])
      setAppState("READY")
      const timer = new CountInTimer()
      setTimeout(
        () => {
          timer.run(tempo)
          setAppState("TESTING")
        },
        BEATS_PER_BAR * tempoToMs(tempo),
      )
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <UI
        appState={appState}
        appMode={appMode}
        tempo={tempo}
        numTouches={times.length}
        trainingResults={trainingResults}
        onTouch={handleTouch}
        onChangeAppMode={handleChangeAppMode}
        onChangeSlider={setTempo}
      />
    </ThemeProvider>
  )
}

type UIProps = {
  appState: AppState
  appMode: AppMode
  tempo: number
  numTouches: number
  trainingResults: string[]
  onTouch: MouseEventHandler
  onChangeAppMode: (val: AppMode | null) => void
  onChangeSlider: (val: number) => void
}

function UI({
  appState,
  appMode,
  tempo,
  numTouches,
  trainingResults,
  onTouch,
  onChangeAppMode,
  onChangeSlider,
}: UIProps) {
  return (
    <div className="w-screen h-screen">
      <div className="fixed w-full h-full pt-[25rem]" onMouseDown={onTouch}>
        {appState === "IDLE" ? (
          <>
            <p className="text-center text-lg">画面タップでスタート</p>
            <p className="text-center text-xs">
              ※消音モードをオフにしてください
            </p>
          </>
        ) : appState === "READY" ? (
          <p className="leading-5 text-center text-lg">READY?</p>
        ) : appState === "TESTING" ? (
          <>
            <p className="leading-5 text-center">{numTouches || "."}</p>
            {numTouches === NUM_TRIALS ? (
              <p className="text-center">画面リロードで再テスト</p>
            ) : (
              <></>
            )}
          </>
        ) : (
          <></>
        )}
        {trainingResults.length > 0 ? (
          <ul className="pt-5 pl-5">
            {trainingResults.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <></>
        )}
      </div>
      <h1 className="p-10 text-2xl text-center">テンポをキープするやつ！</h1>
      <figure>
        <figcaption className="pb-1 text-center">ルール</figcaption>
        <Image
          src={ruleImg}
          alt="ルール：始めに4拍ビープ音が鳴るので、それと同じテンポで1拍目だけ画面をタップする動作を4小節繰り返してください。"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </figure>
      <div className="px-8 pb-8">
        {appMode === "TEST" ? (
          <p className="pt-8 text-center">今日のテンポ</p>
        ) : appMode === "TRAINING" ? (
          <div className="pt-2">
            <Slider
              aria-label="テンポ設定"
              min={40}
              max={220}
              value={tempo}
              valueLabelDisplay="on"
              onChange={(_, val) => onChangeSlider(val as number)}
              disabled={appState !== "IDLE"}
            />
          </div>
        ) : (
          <></>
        )}
        <p className="pb-3 text-center text-lg">BPM {tempo}</p>
        <div className="text-center">
          <ToggleButtonGroup
            size="small"
            color="primary"
            value={appMode}
            exclusive
            onChange={(_, val) => onChangeAppMode(val)}
            aria-label="動作モード"
            disabled={appState !== "IDLE"}
          >
            <ToggleButton value="TEST">テスト</ToggleButton>
            <ToggleButton value="TRAINING">練習</ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>
      <footer className="absolute bottom-0 w-full p-5 text-center text-xs text-blue-600">
        <a href="https://github.com/hashedhyphen/tempo-test">GitHub Repo</a>
      </footer>
    </div>
  )
}
