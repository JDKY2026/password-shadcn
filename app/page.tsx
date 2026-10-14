"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, KeyRound, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

const CHAR_SETS = {
  lower: { label: "小写字母", hint: "a–z", chars: "abcdefghijklmnopqrstuvwxyz" },
  upper: { label: "大写字母", hint: "A–Z", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  digits: { label: "数字", hint: "0–9", chars: "0123456789" },
  symbols: {
    label: "特殊符号",
    hint: "!@#$%…",
    chars: "!@#$%^&*()-_=+[]{};:,.?/~",
  },
} as const

const AMBIGUOUS = "Il1O0o"

type SetKey = keyof typeof CHAR_SETS

function randomInt(max: number) {
  const buf = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / max) * max
  let x: number
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return x % max
}

function poolFor(key: SetKey, excludeAmbiguous: boolean) {
  const chars = CHAR_SETS[key].chars.split("")
  return excludeAmbiguous
    ? chars.filter((c) => !AMBIGUOUS.includes(c))
    : chars
}

function buildPassword(
  length: number,
  enabledKeys: SetKey[],
  excludeAmbiguous: boolean
) {
  const pool = enabledKeys.flatMap((k) => poolFor(k, excludeAmbiguous))
  const picked = enabledKeys.map(
    (k) => poolFor(k, excludeAmbiguous)[randomInt(poolFor(k, excludeAmbiguous).length)]
  )
  const rest = Array.from(
    { length: Math.max(0, length - picked.length) },
    () => pool[randomInt(pool.length)]
  )
  const chars = [...picked, ...rest]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}

function getStrength(entropy: number) {
  if (entropy < 45)
    return {
      label: "弱",
      bar: "[&_[data-slot=progress-indicator]]:bg-red-500",
      badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    }
  if (entropy < 75)
    return {
      label: "中等",
      bar: "[&_[data-slot=progress-indicator]]:bg-amber-500",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    }
  if (entropy < 110)
    return {
      label: "强",
      bar: "[&_[data-slot=progress-indicator]]:bg-lime-500",
      badge: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
    }
  return {
    label: "极强",
    bar: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  }
}

export default function Home() {
  const [length, setLength] = useState(16)
  const [enabled, setEnabled] = useState<Record<SetKey, boolean>>({
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
  })
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)

  const activeKeys = (Object.keys(CHAR_SETS) as SetKey[]).filter(
    (k) => enabled[k]
  )

  const generate = useCallback(() => {
    if (activeKeys.length === 0) return
    setPassword(buildPassword(length, activeKeys, excludeAmbiguous))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, enabled, excludeAmbiguous])

  useEffect(() => {
    generate()
  }, [generate])

  const toggleSet = (key: SetKey, checked: boolean) => {
    setEnabled((prev) => {
      if (!checked && Object.values(prev).filter(Boolean).length <= 1) {
        return prev
      }
      return { ...prev, [key]: checked }
    })
  }

  const copy = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(password)
    } else {
      const ta = document.createElement("textarea")
      ta.value = password
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      ta.remove()
    }
    setCopied(true)
    toast.success("已复制到剪贴板")
    setTimeout(() => setCopied(false), 1500)
  }

  const poolSize = activeKeys.reduce(
    (n, k) => n + poolFor(k, excludeAmbiguous).length,
    0
  )
  const entropy = poolSize > 0 ? length * Math.log2(poolSize) : 0
  const strength = getStrength(entropy)

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-16 top-1/3 size-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <KeyRound className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              密码生成器
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              使用 Web Crypto API 在浏览器本地生成安全随机密码
            </p>
          </div>
        </div>

        <Card className="shadow-lg shadow-black/5 dark:shadow-black/20">
          <CardHeader>
            <CardTitle>生成密码</CardTitle>
            <CardDescription>调整选项后密码会自动重新生成</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 md:grid-cols-2 md:gap-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-2 rounded-xl border bg-muted/40 p-4">
                <p className="min-h-6 flex-1 font-mono text-base leading-relaxed break-all select-all sm:text-lg">
                  {password}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={copy}
                  aria-label="复制密码"
                >
                  {copied ? (
                    <Check className="text-emerald-500" />
                  ) : (
                    <Copy />
                  )}
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.min(entropy / 128, 1) * 100}
                    className={`flex-1 **:data-[slot=progress-track]:h-1.5 ${strength.bar}`}
                  />
                  <Badge className={strength.badge}>{strength.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  熵约 {entropy.toFixed(0)} 位 · 字符池 {poolSize} 个字符
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5 md:border-l md:border-border/60 md:pl-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>密码长度</Label>
                  <Badge variant="secondary" className="tabular-nums">
                    {length}
                  </Badge>
                </div>
                <Slider
                  value={[length]}
                  min={8}
                  max={64}
                  onValueChange={(v) => setLength(Array.isArray(v) ? v[0] : v)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                {(Object.keys(CHAR_SETS) as SetKey[]).map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col">
                      <Label>{CHAR_SETS[key].label}</Label>
                      <span className="text-xs text-muted-foreground">
                        {CHAR_SETS[key].hint}
                      </span>
                    </div>
                    <Switch
                      checked={enabled[key]}
                      onCheckedChange={(c) => toggleSet(key, c)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex flex-col">
                  <Label>排除易混淆字符</Label>
                  <span className="text-xs text-muted-foreground">
                    去除 {AMBIGUOUS.split("").join(" ")}
                  </span>
                </div>
                <Switch
                  checked={excludeAmbiguous}
                  onCheckedChange={setExcludeAmbiguous}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              密码完全在本地生成，不会发送到任何服务器
            </p>
            <Button className="w-full sm:w-auto sm:px-8" onClick={generate}>
              <RefreshCw />
              重新生成
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
