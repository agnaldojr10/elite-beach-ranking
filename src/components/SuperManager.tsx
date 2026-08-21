"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { DatePicker } from "@/components/DatePicker";
import { criarTorneio } from "@/app/torneios/actions";

type StepKey = "nome" | "config" | "jogadores";

type Torneio = {
  id: string;
  nome: string;
  data: string;
  size: number;
  status: "ABERTO" | "ENCERRADO";
  inscritos: number;
};
type Player = { id: string; nome: string; photoUrl: string | null; type: "REGULAR" | "GUEST" };

const brDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

const label = "mb-1 block text-xs font-semibold text-muted";
const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-accent";

function StepSection({
  n,
  title,
  summary,
  done,
  locked,
  open,
  onToggle,
  children,
}: {
  n: number;
  title: string;
  summary: string;
  done: boolean;
  locked: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-line bg-card ${locked ? "opacity-50" : ""}`}>
      <button
        onClick={() => !locked && onToggle()}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            done ? "bg-success text-white" : "bg-accent/15 text-accent"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-ink">{title}</span>
          <span className="block text-xs text-muted">{summary}</span>
        </span>
        <span className={`text-muted transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && !locked && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

export function SuperManager({
  torneios,
  players,
}: {
  torneios: Torneio[];
  players: Player[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [size, setSize] = useState<8 | 12 | 16>(8);
  const [gamesPerMatch, setGamesPerMatch] = useState("7");
  const [courts, setCourts] = useState("2");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<StepKey>("nome");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => p.nome.toLowerCase().includes(q));
  }, [players, search]);

  const g = parseInt(gamesPerMatch, 10);
  const c = parseInt(courts, 10);
  const step1ok = nome.trim().length >= 2 && data !== "";
  const step2ok =
    Number.isInteger(g) && g >= 3 && g <= 21 && g % 2 === 1 && Number.isInteger(c) && c >= 1 && c <= 8;
  const step3ok = sel.size === size;

  function toggle(id: string) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < size) next.add(id);
      return next;
    });
  }

  function reset() {
    setNome("");
    setData("");
    setSize(8);
    setGamesPerMatch("7");
    setCourts("2");
    setSel(new Set());
    setSearch("");
    setExpanded("nome");
    setError(null);
  }

  function criar() {
    setError(null);
    if (sel.size !== size) {
      setError(`Selecione exatamente ${size} atletas (${sel.size} marcados).`);
      return;
    }
    startTransition(async () => {
      const res = await criarTorneio({
        nome,
        data,
        size,
        courts: parseInt(courts, 10) || 1,
        gamesPerMatch: parseInt(gamesPerMatch, 10) || 7,
        playerIds: [...sel],
      });
      if (res.ok) {
        setOpen(false);
        reset();
        router.push(`/torneios/${res.id}`);
      } else setError(res.error);
    });
  }

  const sizeBtn = (v: 8 | 12 | 16) => (
    <button
      onClick={() => {
        setSize(v);
        setSel((prev) => new Set([...prev].slice(0, v)));
      }}
      className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${
        size === v ? "bg-accent text-accent-ink" : "border border-line bg-card text-muted"
      }`}
    >
      Super {v}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Torneio Americano: cada atleta joga de dupla com todos os outros. Ranking do dia por
        Vitórias · Saldo · Games. Evento avulso (não afeta a temporada).
      </p>

      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink"
      >
        + Novo torneio
      </button>

      {torneios.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Nenhum torneio ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {torneios.map((t) => (
            <li key={t.id}>
              <Link
                href={`/torneios/${t.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-xs font-bold text-accent">
                  S{t.size}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-ink">{t.nome}</span>
                  <span className="block text-xs text-muted">
                    {brDate(t.data)} · {t.inscritos} atletas
                  </span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                    t.status === "ABERTO" ? "bg-ocean/15 text-ocean" : "bg-success/15 text-success"
                  }`}
                >
                  {t.status === "ABERTO" ? "Em jogo" : "Encerrado"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55" onClick={() => setOpen(false)}>
          <div
            className="mx-auto max-h-[90%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Novo torneio Super</h2>
              <button onClick={() => setOpen(false)} className="text-muted">
                ✕
              </button>
            </div>

            {error && <p className="mb-3 text-sm font-semibold text-danger">{error}</p>}

            <div className="flex flex-col gap-3">
              {/* Passo 1 — Nome e data */}
              <StepSection
                n={1}
                title="Nome e data"
                summary={step1ok ? `${nome} · ${brDate(data)}` : "Informe o nome e a data"}
                done={step1ok}
                locked={false}
                open={expanded === "nome"}
                onToggle={() => setExpanded(expanded === "nome" ? ("" as StepKey) : "nome")}
              >
                <label className={label}>Nome</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={`${field} mb-3`}
                  placeholder="Super 8 de Verão"
                />
                <label className={label}>Data</label>
                <div className="mb-3">
                  <DatePicker value={data} onChange={setData} />
                </div>
                <button
                  onClick={() => setExpanded("config")}
                  disabled={!step1ok}
                  className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-60"
                >
                  Continuar
                </button>
              </StepSection>

              {/* Passo 2 — Formato, games e quadras */}
              <StepSection
                n={2}
                title="Formato, games e quadras"
                summary={`Super ${size} · ${gamesPerMatch || "?"} games · ${courts || "?"} quadra(s)`}
                done={step2ok}
                locked={!step1ok}
                open={expanded === "config"}
                onToggle={() => setExpanded(expanded === "config" ? ("" as StepKey) : "config")}
              >
                <label className={label}>Formato</label>
                <div className="mb-3 flex gap-2">
                  {sizeBtn(8)}
                  {sizeBtn(12)}
                  {sizeBtn(16)}
                </div>
                <div className="mb-3 flex gap-3">
                  <div className="flex-1">
                    <label className={label}>Games por jogo (ímpar)</label>
                    <input
                      inputMode="numeric"
                      value={gamesPerMatch}
                      onChange={(e) => setGamesPerMatch(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      className={field}
                    />
                  </div>
                  <div className="flex-1">
                    <label className={label}>Quadras</label>
                    <input
                      inputMode="numeric"
                      value={courts}
                      onChange={(e) => setCourts(e.target.value.replace(/\D/g, "").slice(0, 1))}
                      className={field}
                    />
                  </div>
                </div>
                <button
                  onClick={() => setExpanded("jogadores")}
                  disabled={!step2ok}
                  className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-60"
                >
                  Continuar
                </button>
              </StepSection>

              {/* Passo 3 — Jogadores */}
              <StepSection
                n={3}
                title="Jogadores"
                summary={`${sel.size}/${size} atletas selecionados`}
                done={step3ok}
                locked={!step1ok || !step2ok}
                open={expanded === "jogadores"}
                onToggle={() => setExpanded(expanded === "jogadores" ? ("" as StepKey) : "jogadores")}
              >
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className={`${field} mb-2`}
                />
                <ul className="mb-3 flex max-h-56 flex-col gap-1 overflow-y-auto">
                  {list.map((p) => {
                    const on = sel.has(p.id);
                    const disabled = !on && sel.size >= size;
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => toggle(p.id)}
                          disabled={disabled}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left disabled:opacity-40"
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] ${
                              on ? "border-accent bg-accent text-accent-ink" : "border-line text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span className="flex-1 truncate text-sm text-ink">{p.nome}</span>
                          {p.type === "GUEST" && (
                            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
                              Convidado
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={criar}
                  disabled={pending || !step3ok}
                  className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-60"
                >
                  {pending ? "Gerando tabela…" : "Criar e gerar tabela"}
                </button>
              </StepSection>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
