"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DatePicker } from "@/components/DatePicker";
import { ImageUpload } from "@/components/ImageUpload";
import {
  createChampionship,
  generateRounds,
  setChampionshipStatus,
  updateChampionship,
} from "@/app/cadastros/campeonatos/actions";
import { selecionarCampeonato } from "@/app/campeonatos/actions";

type Champ = {
  id: string;
  nome: string;
  temporada: string;
  formato: string;
  status: "ATIVA" | "ENCERRADA";
  inicio: string;
  fim: string;
  finalsDate: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  ptsParticipacao: number;
  ptsQuartas: number;
  pts4: number;
  pts3: number;
  ptsVice: number;
  ptsCampeao: number;
  lastRoundDouble: boolean;
};
type Draft = Omit<Champ, "status" | "id"> & { id?: string };
type GenState = { id: string; qtd: number; inicio: string };

type PtsKey = "ptsParticipacao" | "ptsQuartas" | "pts4" | "pts3" | "ptsVice" | "ptsCampeao";
const PONTOS: { key: PtsKey; label: string }[] = [
  { key: "ptsParticipacao", label: "Participação" },
  { key: "ptsQuartas", label: "Quartas" },
  { key: "pts4", label: "4º lugar" },
  { key: "pts3", label: "3º lugar" },
  { key: "ptsVice", label: "Vice" },
  { key: "ptsCampeao", label: "Campeão" },
];

const brDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-accent";
const label = "mb-1 block text-xs font-semibold text-muted";

export function ChampionshipsManager({ campeonatos }: { campeonatos: Champ[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [gen, setGen] = useState<GenState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const newDraft = (): Draft => ({
    nome: "",
    temporada: "",
    formato: "Grupos + mata-mata",
    inicio: "",
    fim: "",
    finalsDate: "",
    bannerUrl: null,
    logoUrl: null,
    ptsParticipacao: 10,
    ptsQuartas: 20,
    pts4: 40,
    pts3: 60,
    ptsVice: 80,
    ptsCampeao: 100,
    lastRoundDouble: true,
  });

  function save() {
    if (!draft) return;
    setError(null);
    const { id, ...input } = draft;
    startTransition(async () => {
      const res = id ? await updateChampionship(id, input) : await createChampionship(input);
      if (res.ok) {
        setDraft(null);
        router.refresh();
      } else setError(res.error);
    });
  }

  function alterarStatus(id: string, status: "ATIVA" | "ENCERRADA") {
    startTransition(async () => {
      const res = await setChampionshipStatus(id, status);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function selecionar(id: string) {
    startTransition(async () => {
      const res = await selecionarCampeonato(id);
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else setError(res.error);
    });
  }

  function runGen() {
    if (!gen) return;
    setError(null);
    startTransition(async () => {
      const res = await generateRounds(gen.id, { qtd: gen.qtd, inicio: gen.inicio });
      if (res.ok) {
        setGen(null);
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Link
          href="/cadastros/jogadores"
          className="flex-1 rounded-xl border border-line bg-card py-2.5 text-center text-sm font-semibold text-muted"
        >
          Jogadores
        </Link>
        <span className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-accent-ink">
          Campeonatos
        </span>
      </div>

      <button
        onClick={() => {
          setError(null);
          setDraft(newDraft());
        }}
        className="rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink"
      >
        + Novo campeonato
      </button>

      {campeonatos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Nenhum campeonato ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {campeonatos.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-ink">{c.nome}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                    c.status === "ATIVA" ? "bg-success/15 text-success" : "bg-line text-muted"
                  }`}
                >
                  {c.status === "ATIVA" ? "Em andamento" : "Encerrado"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {brDate(c.inicio)}–{brDate(c.fim)} · Finals {brDate(c.finalsDate)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.status === "ATIVA" && (
                  <button
                    onClick={() => selecionar(c.id)}
                    disabled={pending}
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-ink disabled:opacity-70"
                  >
                    Selecionar
                  </button>
                )}
                <button
                  onClick={() => {
                    setError(null);
                    setDraft({ ...c });
                  }}
                  className="rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-accent"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setGen({ id: c.id, qtd: 10, inicio: c.inicio });
                  }}
                  className="rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-accent"
                >
                  Gerar rodadas
                </button>
                {c.status === "ATIVA" ? (
                  <button
                    onClick={() => alterarStatus(c.id, "ENCERRADA")}
                    disabled={pending}
                    className="rounded-lg bg-danger/15 px-3 py-2 text-xs font-semibold text-danger disabled:opacity-70"
                  >
                    Encerrar
                  </button>
                ) : (
                  <button
                    onClick={() => alterarStatus(c.id, "ATIVA")}
                    disabled={pending}
                    className="rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-accent disabled:opacity-70"
                  >
                    Reabrir
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* modal criar/editar */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55" onClick={() => setDraft(null)}>
          <div
            className="mx-auto max-h-[88%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">
                {draft.id ? "Editar campeonato" : "Novo campeonato"}
              </h2>
              <button onClick={() => setDraft(null)} className="text-muted">
                ✕
              </button>
            </div>

            <label className={label}>Nome</label>
            <input
              value={draft.nome}
              onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
              className={`${field} mb-3`}
            />
            <label className={label}>Temporada</label>
            <input
              value={draft.temporada}
              onChange={(e) => setDraft({ ...draft, temporada: e.target.value })}
              className={`${field} mb-3`}
            />
            <label className={label}>Formato</label>
            <input
              value={draft.formato}
              onChange={(e) => setDraft({ ...draft, formato: e.target.value })}
              className={`${field} mb-3`}
            />

            <label className={label}>Banner do campeonato</label>
            <div className="mb-3">
              <ImageUpload
                value={draft.bannerUrl}
                onChange={(url) => setDraft({ ...draft, bannerUrl: url })}
                aspect="wide"
              />
            </div>

            <label className={label}>Logo do campeonato</label>
            <div className="mb-3">
              <ImageUpload
                value={draft.logoUrl}
                onChange={(url) => setDraft({ ...draft, logoUrl: url })}
                aspect="square"
              />
            </div>
            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <label className={label}>Início</label>
                <DatePicker
                  value={draft.inicio}
                  onChange={(iso) => setDraft({ ...draft, inicio: iso })}
                />
              </div>
              <div className="flex-1">
                <label className={label}>Fim</label>
                <DatePicker
                  value={draft.fim}
                  onChange={(iso) => setDraft({ ...draft, fim: iso })}
                />
              </div>
            </div>
            <label className={label}>Data da FINALS</label>
            <div className="mb-3">
              <DatePicker
                value={draft.finalsDate}
                onChange={(iso) => setDraft({ ...draft, finalsDate: iso })}
              />
            </div>

            <label className={label}>Pontuação por posição</label>
            <div className="mb-3 rounded-xl border border-line bg-card p-3">
              {PONTOS.map((p) => (
                <div
                  key={p.key}
                  className="flex items-center justify-between border-b border-line py-2 last:border-0"
                >
                  <span className="text-sm text-ink">{p.label}</span>
                  <input
                    inputMode="numeric"
                    value={draft[p.key] as number}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [p.key]: parseInt(e.target.value.replace(/\D/g, "")) || 0,
                      })
                    }
                    className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-sm font-semibold text-ink outline-none focus:border-accent"
                  />
                </div>
              ))}
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Última etapa vale 2x</p>
                <p className="text-xs text-muted">Ao gerar as rodadas, a última recebe peso 2x.</p>
              </div>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, lastRoundDouble: !draft.lastRoundDouble })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  draft.lastRoundDouble ? "bg-accent" : "bg-line"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    draft.lastRoundDouble ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {error && <p className="mb-2 text-sm font-semibold text-danger">{error}</p>}
            <button
              onClick={save}
              disabled={pending}
              className="mt-1 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* modal gerar rodadas */}
      {gen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55" onClick={() => setGen(null)}>
          <div
            className="mx-auto w-full max-w-md rounded-t-3xl bg-surface p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Gerar rodadas</h2>
              <button onClick={() => setGen(null)} className="text-muted">
                ✕
              </button>
            </div>
            <label className={label}>Nº de rodadas</label>
            <input
              type="number"
              min={1}
              max={30}
              value={gen.qtd}
              onChange={(e) => setGen({ ...gen, qtd: parseInt(e.target.value) || 1 })}
              className={`${field} mb-3`}
            />
            <label className={label}>Data da 1ª rodada</label>
            <div className="mb-2">
              <DatePicker value={gen.inicio} onChange={(iso) => setGen({ ...gen, inicio: iso })} />
            </div>
            <p className="mb-2 text-xs text-muted">
              Cria uma rodada por semana; a última já vem com peso 2x e a FINALS é criada como
              etapa especial.
            </p>
            {error && <p className="mb-2 text-sm font-semibold text-danger">{error}</p>}
            <button
              onClick={runGen}
              disabled={pending}
              className="mt-1 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
            >
              {pending ? "Gerando…" : "Gerar rodadas"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
