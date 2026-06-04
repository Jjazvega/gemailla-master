import React, { useState, useRef, useEffect } from 'react';
import { firebase } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/lib/companyContext';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { logAction } from '@/lib/auditLogger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Send, Loader2, FileText, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import PlanGate from '@/components/subscription/PlanGate';
import { useSubscription } from '@/lib/subscriptionContext';

const suggestedQueries = [
  '¿Cuál es el total de gastos en nómina este año?',
  '¿Qué facturas tengo pendientes de analizar?',
  'Resumen financiero de mi empresa',
  '¿Cuáles son mis principales proveedores?',
];

export default function AIAssistant() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const chatEndRef = useRef(null);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', activeCompany?.id],
    queryFn: () => firebase.entities.Document.filter({ companyId: activeCompany.id }),
    enabled: !!activeCompany,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', activeCompany?.id],
    queryFn: () => firebase.entities.Transaction.filter({ companyId: activeCompany.id }),
    enabled: !!activeCompany,
  });

  const { data: savedConvos = [] } = useQuery({
    queryKey: ['conversations', activeCompany?.id],
    queryFn: () => firebase.entities.AIConversation.filter({ companyId: activeCompany.id }, '-createdAt', 20),
    enabled: !!activeCompany,
  });

  useEffect(() => {
    if (savedConvos.length > 0 && conversations.length === 0) {
      setConversations(savedConvos.map(c => ({ query: c.query, response: c.response, docs: c.context_documents })));
    }
  }, [savedConvos]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const handleSubmit = async (q) => {
    const userQuery = q || query;
    if (!userQuery.trim()) return;
    setQuery('');
    setLoading(true);

    const newConvo = { query: userQuery, response: null, docs: [] };
    setConversations(prev => [...prev, newConvo]);

    // Build context from documents and transactions
    const relevantDocs = documents
      .filter(d => d.status === 'analyzed')
      .filter(d => filterDocType === 'all' || d.docType === filterDocType)
      .slice(0, 15);

    const docContext = relevantDocs.map(d =>
      `[${d.docType || 'doc'}] ${d.title} | Total: $${d.total || 0} | Fecha: ${d.docDate || 'N/A'} | RFC: ${d.rfc_emisor || 'N/A'} | Resumen: ${d.ai_summary || 'Sin resumen'}`
    ).join('\n');

    const txSummary = {
      total_ingresos: transactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + (t.amount || 0), 0),
      total_gastos: transactions.filter(t => t.type === 'gasto').reduce((s, t) => s + (t.amount || 0), 0),
      num_transactions: transactions.length,
    };

    const response = await firebase.integrations.Core.InvokeLLM({
      prompt: `Eres GEMAILLA AI, un asistente financiero experto para empresas mexicanas. Responde con datos reales basados en el contexto.

Empresa: ${activeCompany.name}
RFC: ${activeCompany.rfc || 'N/A'}

DOCUMENTOS ANALIZADOS:
${docContext || 'Sin documentos analizados aún.'}

RESUMEN FINANCIERO:
- Ingresos totales: $${txSummary.total_ingresos.toLocaleString()}
- Gastos totales: $${txSummary.total_gastos.toLocaleString()}
- Balance: $${(txSummary.total_ingresos - txSummary.total_gastos).toLocaleString()}
- Transacciones: ${txSummary.num_transactions}

PREGUNTA DEL USUARIO:
${userQuery}

Responde de forma profesional, concisa y con datos específicos. Usa formato markdown para mejor legibilidad.`
    });

    const updated = { query: userQuery, response, docs: relevantDocs.map(d => d.id) };
    setConversations(prev => [...prev.slice(0, -1), updated]);
    setLoading(false);

    await firebase.entities.AIConversation.create({
      companyId: activeCompany.id,
      userEmail: user.email,
      query: userQuery,
      response,
      context_documents: updated.docs,
      filters_used: { docType: filterDocType }
    });

    await logAction({
      companyId: activeCompany.id, userEmail: user.email, userName: user.fullName,
      action: 'ai_query', entityType: 'AIConversation', details: userQuery
    });
  };

  const { canAccessAIAssistant, loading: subLoading } = useSubscription();

  if (!activeCompany) return <EmptyState icon={Brain} title="Selecciona una empresa" description="Necesitas una empresa activa." />;

  if (!subLoading && !canAccessAIAssistant) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="IA Asistente" description="Consulta inteligente sobre tus documentos y finanzas." />
        <PlanGate requiredPlan="enterprise" featureName="Asistente de IA Personalizado">
          <div />
        </PlanGate>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader title="IA Asistente" description="Consulta inteligente sobre tus documentos y finanzas." />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Select value={filterDocType} onValueChange={setFilterDocType}>
          <SelectTrigger className="w-44 bg-card border-border">
            <FileText className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtro documentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los documentos</SelectItem>
            <SelectItem value="factura">Facturas</SelectItem>
            <SelectItem value="recibo">Recibos</SelectItem>
            <SelectItem value="contrato">Contratos</SelectItem>
            <SelectItem value="nómina">Nóminas</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" />
          {documents.filter(d => d.status === 'analyzed').length} documentos indexados
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/50 p-4 mb-4 space-y-4">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <Brain className="w-12 h-12 text-primary/30 mb-4" />
            <p className="text-muted-foreground text-sm mb-6">Pregunta lo que necesites sobre tu empresa</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
              {suggestedQueries.map(q => (
                <button key={q} onClick={() => handleSubmit(q)}
                  className="text-left p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors text-sm text-muted-foreground hover:text-foreground">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {conversations.map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {/* User message */}
              <div className="flex justify-end mb-3">
                <div className="max-w-[80%] p-3 rounded-xl bg-primary text-primary-foreground text-sm">
                  {c.query}
                </div>
              </div>
              {/* AI response */}
              {c.response ? (
                <div className="flex justify-start mb-4">
                  <div className="max-w-[80%] p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">GEMAILLA AI</span>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground">
                      <ReactMarkdown>{c.response}</ReactMarkdown>
                    </div>
                    {c.docs?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
                        Basado en {c.docs.length} documentos
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start mb-4">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex gap-3">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Escribe tu consulta..."
          className="flex-1 bg-card border-border"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !query.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}