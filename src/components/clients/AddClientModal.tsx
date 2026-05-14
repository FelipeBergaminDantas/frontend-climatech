'use client'

import { useState, useEffect } from 'react'
import {
  createClienteInBackend,
  updateClienteInBackend,
  type ClienteCreate,
  type ClienteResponse,
} from '@/services/apiService'

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mode?: 'create' | 'edit'
  initialData?: ClienteResponse | null
}

const initialFormState: ClienteCreate = {
  nome: '',
  num_cpf_cnpj: '',
  des_email: '',
  num_telefone: '',
  num_cep: '',
  des_endereco: '',
  end_numero: '',
  end_complemento: '',
  end_bairro: '',
  end_cidade: '',
  end_estado: '',
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function formatCpfCnpj(value: string, type: 'cpf' | 'cnpj') {
  const digits = onlyDigits(value).slice(0, type === 'cpf' ? 11 : 14)

  if (type === 'cpf') {
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
  }

  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export default function AddClientModal({ isOpen, onClose, onSuccess, mode = 'create', initialData = null }: AddClientModalProps) {
  const [formData, setFormData] = useState<ClienteCreate>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cpfCnpjType, setCpfCnpjType] = useState<'cpf' | 'cnpj'>('cpf')
  const [isFetchingCep, setIsFetchingCep] = useState(false)
  const [lastFetchedCep, setLastFetchedCep] = useState('')

  const isEditMode = mode === 'edit' && initialData !== null

  useEffect(() => {
    if (isOpen && isEditMode && initialData) {
      const digits = onlyDigits(initialData.num_cpf_cnpj)
      setCpfCnpjType(digits.length === 14 ? 'cnpj' : 'cpf')
      setFormData({
        nome: initialData.nome,
        num_cpf_cnpj: initialData.num_cpf_cnpj,
        des_email: initialData.des_email ?? '',
        num_telefone: initialData.num_telefone ?? '',
        num_cep: initialData.num_cep ?? '',
        des_endereco: initialData.des_endereco ?? '',
        end_numero: initialData.end_numero ?? '',
        end_complemento: initialData.end_complemento ?? '',
        end_bairro: initialData.end_bairro ?? '',
        end_cidade: initialData.end_cidade ?? '',
        end_estado: initialData.end_estado ?? '',
      })
      setError(null)
      return
    }

    if (isOpen && !isEditMode) {
      setCpfCnpjType('cpf')
      setFormData(initialFormState)
      setError(null)
      setLastFetchedCep('')
    }
  }, [isOpen, isEditMode, initialData])

  useEffect(() => {
      const cepDigits = onlyDigits(formData.num_cep ?? '')
    if (cepDigits.length !== 8 || cepDigits === lastFetchedCep) return

    const fetchCep = async () => {
      setIsFetchingCep(true)
      setError(null)

      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
        if (!response.ok) {
          throw new Error('Não foi possível consultar o CEP')
        }

        const data = await response.json()
        if (data.erro) {
          throw new Error('CEP não encontrado')
        }

        setFormData(prev => ({
          ...prev,
          des_endereco: prev.des_endereco || data.logradouro || '',
          end_bairro: prev.end_bairro || data.bairro || '',
          end_cidade: prev.end_cidade || data.localidade || '',
          end_estado: prev.end_estado || data.uf || '',
        }))
        setLastFetchedCep(cepDigits)
      } catch (fetchError: any) {
        setError(fetchError.message || 'Erro ao buscar CEP')
      } finally {
        setIsFetchingCep(false)
      }
    }

    fetchCep()
  }, [formData.num_cep, lastFetchedCep])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleCpfCnpjChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      num_cpf_cnpj: formatCpfCnpj(value, cpfCnpjType),
    }))
    setError(null)
  }

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      num_telefone: formatPhone(value),
    }))
    setError(null)
  }

  const handleCepChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      num_cep: formatCep(value),
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const cliente = isEditMode && initialData
        ? await updateClienteInBackend(initialData.id, formData)
        : await createClienteInBackend(formData)

      if (cliente) {
        alert(isEditMode ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!')
        onSuccess()
        onClose()
        setFormData(initialFormState)
      }
    } catch (err: any) {
      setError(err.message || (isEditMode ? 'Erro ao atualizar cliente. Tente novamente.' : 'Erro ao criar cliente. Tente novamente.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold" style={{ color: '#0f2744' }}>
            {isEditMode ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
              placeholder="Nome do cliente"
            />
          </div>

          {/* CPF/CNPJ */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                name="cpfCnpjType"
                value={cpfCnpjType}
                onChange={(e) => {
                  const type = e.target.value as 'cpf' | 'cnpj'
                  setCpfCnpjType(type)
                  setFormData(prev => ({
                    ...prev,
                    num_cpf_cnpj: formatCpfCnpj(prev.num_cpf_cnpj, type),
                  }))
                  setError(null)
                }}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
                CPF/CNPJ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="num_cpf_cnpj"
                value={formData.num_cpf_cnpj}
                onChange={(e) => handleCpfCnpjChange(e.target.value)}
                required
                maxLength={18}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
              <p className="text-xs text-slate-400 mt-1">Digite o CPF ou CNPJ com formatação automática.</p>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="des_email"
              value={formData.des_email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
              Telefone
            </label>
            <input
              type="tel"
              name="num_telefone"
              value={formData.num_telefone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              maxLength={15}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* CEP */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
              CEP
            </label>
            <input
              type="text"
              name="num_cep"
              value={formData.num_cep}
              onChange={(e) => handleCepChange(e.target.value)}
              maxLength={9}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
              placeholder="00000-000"
            />
            <p className="text-xs text-slate-400 mt-1">Preenchimento automático de endereço quando o CEP estiver completo.</p>
            {isFetchingCep && (
              <p className="text-xs text-slate-500 mt-1">Consultando CEP...</p>
            )}
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
              Endereço
            </label>
            <input
              type="text"
              name="des_endereco"
              value={formData.des_endereco}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
              placeholder="Rua, Avenida, etc."
            />
          </div>

          {/* Número e Complemento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
                Número
              </label>
              <input
                type="text"
                name="end_numero"
                value={formData.end_numero}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
                placeholder="123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
                Complemento (Opcional)
              </label>
              <input
                type="text"
                name="end_complemento"
                value={formData.end_complemento}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
                placeholder="Apto, Sala, etc."
              />
            </div>
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
              Bairro
            </label>
            <input
              type="text"
              name="end_bairro"
              value={formData.end_bairro}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
              placeholder="Nome do bairro"
            />
          </div>

          {/* Cidade e Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
                Cidade
              </label>
              <input
                type="text"
                name="end_cidade"
                value={formData.end_cidade}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
                placeholder="Nome da cidade"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>
                Estado
              </label>
              <select
                name="end_estado"
                value={formData.end_estado}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#1e5fa8]"
              >
                <option value="">Selecione</option>
                {estados.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-xl font-medium transition-colors"
              style={{ background: '#f1f5f9', color: '#64748b' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: '#1e5fa8' }}
            >
              {isSubmitting ? (isEditMode ? 'Salvando...' : 'Criando...') : (isEditMode ? 'Salvar Cliente' : 'Criar Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
