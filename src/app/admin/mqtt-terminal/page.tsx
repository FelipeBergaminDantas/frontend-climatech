'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { API_BASE_URL, buildHeaders } from '@/services/apiService'

type MqttMessage = {
  timestamp: string
  topic: string
  payload: any
  qos: number
}

type TopicNode = {
  name: string
  path: string
  count: number
  children: TopicNode[]
}

export default function MqttTerminalPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<any>(null)
  const [messages, setMessages] = useState<MqttMessage[]>([])
  const [topicInput, setTopicInput] = useState('')
  const [payloadInput, setPayloadInput] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const pollingRef = useRef<number | null>(null)

  async function loadStatus() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/mqtt/status`, {
        headers: buildHeaders(false),
      })
      if (res.ok) {
        setStatus(await res.json())
        setError(null)
      } else {
        const payload = await res.text()
        setError(`Falha ao carregar status MQTT: ${res.status} ${payload}`)
        setStatus(null)
      }
    } catch (e) {
      setError(`Falha ao carregar status MQTT: ${String(e)}`)
      setStatus(null)
    }
  }

  async function loadMessages() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/mqtt/messages`, {
        headers: buildHeaders(false),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
        setError(null)
      } else {
        const payload = await res.text()
        setError(`Falha ao carregar mensagens MQTT: ${res.status} ${payload}`)
      }
    } catch (e) {
      setError(`Falha ao carregar mensagens MQTT: ${String(e)}`)
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin_master') return

    Promise.all([loadStatus(), loadMessages()]).finally(() => setLoading(false))
    pollingRef.current = window.setInterval(() => {
      loadStatus()
      loadMessages()
    }, 2000)

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setMessages([])
      setSelectedTopic(null)
      setExpandedPaths(new Set([ROOT_TOPIC]))
      setError(null)
    }
  }, [user])

  const ROOT_TOPIC = 'climatech'

  const topicCounts = useMemo(() => {
    return messages.reduce<Record<string, number>>((current, message) => {
      if (message.topic === ROOT_TOPIC || message.topic.startsWith(`${ROOT_TOPIC}/`)) {
        current[message.topic] = (current[message.topic] ?? 0) + 1
      }
      return current
    }, {})
  }, [messages])

  const allTopics = useMemo(() => {
    return Object.keys(topicCounts).sort()
  }, [topicCounts])

  const topicTree = useMemo(() => {
    const root: TopicNode = { name: ROOT_TOPIC, path: ROOT_TOPIC, count: 0, children: [] }

    for (const topic of allTopics) {
      const count = topicCounts[topic] ?? 0
      const segments = topic.split('/')
      let current = root
      current.count += count
      let currentPath = ROOT_TOPIC

      for (let index = 1; index < segments.length; index += 1) {
        currentPath = `${currentPath}/${segments[index]}`
        let child = current.children.find((node) => node.path === currentPath)
        if (!child) {
          child = { name: segments[index], path: currentPath, count: 0, children: [] }
          current.children.push(child)
        }
        child.count += count
        current = child
      }
    }

    const sortNodes = (nodes: TopicNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name))
      nodes.forEach((node) => sortNodes(node.children))
    }
    sortNodes(root.children)

    return root
  }, [allTopics, topicCounts])

  const devices = useMemo(() => {
    const map = new Map<string, { lastSeen?: string; count: number }>()
    for (const m of messages) {
      const seg = m.topic.split('/')
      if (seg.length >= 2 && seg[0] === ROOT_TOPIC) {
        const id = seg[1]
        const prev = map.get(id) ?? { lastSeen: undefined, count: 0 }
        prev.count += 1
        const timestampValue = typeof m.payload === 'object' && m.payload ? (m.payload.timestamp as string) : undefined
        const lastSeen = timestampValue || m.timestamp
        if (!prev.lastSeen || new Date(lastSeen) > new Date(prev.lastSeen)) prev.lastSeen = lastSeen
        map.set(id, prev)
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, v]) => ({ id, lastSeen: v.lastSeen, count: v.count }))
  }, [messages])

  const deviceCount = devices.length

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([ROOT_TOPIC]))

  const toggleExpanded = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const brokerLabel = status?.broker ? status.broker : 'Broker MQTT'

  const filteredMessages = useMemo(() => {
    if (!selectedTopic) return messages
    return messages.filter((message) => message.topic === selectedTopic || message.topic.startsWith(`${selectedTopic}/`))
  }, [messages, selectedTopic])

  const renderTopicNode = (node: TopicNode, level: number) => {
    const isExpanded = expandedPaths.has(node.path)
    const hasChildren = node.children.length > 0
    const isSelected = selectedTopic === node.path

    return (
      <div key={node.path}>
        <div className="flex items-center gap-2 text-sm" style={{ paddingLeft: `${level * 16}px` }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpanded(node.path)}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="inline-block h-6 w-6" />
          )}
          <button
            type="button"
            onClick={() => setSelectedTopic(node.path)}
            className={`flex-1 text-left text-sm ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700 hover:text-slate-900'}`}
          >
            {node.name}
          </button>
          <span className="text-xs text-slate-500">{node.count}</span>
        </div>
        {hasChildren && isExpanded ? node.children.map((child) => renderTopicNode(child, level + 1)) : null}
      </div>
    )
  }

  const refreshTree = async () => {
    try {
      setRefreshing(true)
      await loadMessages()
    } finally {
      setRefreshing(false)
    }
  }


  async function handlePublish() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/mqtt/publish`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ topic: topicInput, payload: tryParseJson(payloadInput) }),
      })
      if (!res.ok) {
        const payload = await res.text()
        setError(`Falha ao publicar MQTT: ${res.status} ${payload}`)
        return
      }
      setTopicInput('')
      setPayloadInput('')
      setError(null)
    } catch (e) {
      setError(`Falha ao publicar MQTT: ${String(e)}`)
    }
  }

  function tryParseJson(s: string) {
    try { return JSON.parse(s) } catch { return s }
  }

  if (!user || user.role !== 'admin_master') {
    return <div className="p-6">Acesso negado. Somente `adm_master`.</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Terminal MQTT</h1>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Tópicos MQTT</h2>
              <p className="text-xs text-slate-500">
                {allTopics.length} tópicos • {deviceCount} dispositivos
              </p>
            </div>
            <button
              type="button"
              onClick={refreshTree}
              disabled={refreshing}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          {/* Removed topic search — show full tree like MQTT Explorer */}

          <div className="mt-4 max-h-[70vh] overflow-y-auto rounded border bg-white px-1 py-2">
            <div className="px-3 py-2">
              <div className="mb-2 text-sm font-medium">Broker MQTT</div>
              <div className="mb-3 text-xs text-slate-500">
                <p>{brokerLabel}</p>
                <p>Clique em um nó para filtrar mensagens.</p>
              </div>

              {topicTree.children.length === 0 ? (
                <div className="space-y-2 px-3 py-2 text-sm text-slate-500">
                  <p>Nenhum dispositivo detectado ainda. Os dispositivos aparecerão após publicarem mensagens MQTT.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-block h-6 w-6" />
                    <button
                      type="button"
                      onClick={() => toggleExpanded(ROOT_TOPIC)}
                      className="flex-1 text-left text-sm font-semibold text-slate-900"
                    >
                      {ROOT_TOPIC}
                    </button>
                    <span className="text-xs text-slate-500">{topicTree.count}</span>
                  </div>
                  {expandedPaths.has(ROOT_TOPIC) ? topicTree.children.map((child) => renderTopicNode(child, 2)) : null}
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-lg p-4 border bg-white">
              <h2 className="font-semibold mb-2">Status</h2>
              {loading ? (
                <p className="text-sm text-slate-500">Carregando status...</p>
              ) : error ? (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : (
                <>
                  <p>Conexão: <strong>{status?.connected ? 'ONLINE' : 'OFFLINE'}</strong></p>
                  <p>
                    Broker:{' '}
                    {status?.broker ? (
                      (() => {
                        const scheme = status?.tls ? 'mqtts' : 'mqtt'
                        const url = `${scheme}://${status.broker}:${status.port}`
                        return (
                          <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                            {url}
                          </a>
                        )
                      })()
                    ) : '—'}
                  </p>
                  <p>Porta: {status?.port}</p>
                  <p>TLS: {status?.tls ? 'Ativado' : 'Desativado'}</p>
                  <p>Última conexão: {status?.last_connected_at ?? '—'}</p>
                </>
              )}
            </div>

            <div className="rounded-lg p-4 border bg-white">
              <h2 className="font-semibold mb-2">Publicar mensagem</h2>
              <div className="flex gap-2 mb-2">
                <input value={topicInput} onChange={e => setTopicInput(e.target.value)} placeholder="Tópico" className="flex-1 px-3 py-2 border rounded" />
                <button onClick={handlePublish} className="px-4 py-2 bg-blue-600 text-white rounded">Publicar</button>
              </div>
              <textarea value={payloadInput} onChange={e => setPayloadInput(e.target.value)} placeholder='Payload (JSON ou texto)' className="w-full h-28 p-2 border rounded" />
            </div>
          </div>

          <div className="rounded-lg p-4 border bg-white">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">Mensagens recentes</h2>
                <p className="text-sm text-slate-500">
                  {selectedTopic ? `Filtrando por ${selectedTopic}` : 'Exibindo todas as mensagens'} • {filteredMessages.length} mensagens
                </p>
              </div>
              {selectedTopic ? (
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Limpar filtro
                </button>
              ) : null}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-2">Timestamp</th>
                    <th className="py-2">Tópico</th>
                    <th className="py-2">Payload</th>
                    <th className="py-2">QoS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.slice().reverse().map((m, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2 align-top font-mono text-xs">{new Date(m.timestamp).toLocaleString()}</td>
                      <td className="py-2 align-top font-mono text-xs">{m.topic}</td>
                      <td className="py-2 align-top"><pre className="text-xs whitespace-pre-wrap">{typeof m.payload === 'string' ? m.payload : JSON.stringify(m.payload, null, 2)}</pre></td>
                      <td className="py-2 align-top">{m.qos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
