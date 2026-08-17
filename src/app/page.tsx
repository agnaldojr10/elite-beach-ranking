import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();
  const nome = session?.user?.name ?? "Admin";

  return (
    <main className="min-h-dvh bg-[#0C2126] px-6 py-10 text-[#F3EEE2]">
      <header className="mx-auto flex max-w-md items-center justify-between">
        <div>
          <p className="text-2xl font-bold">Olá, {nome}</p>
          <p className="mt-1 text-sm text-[#8FA9AE]">Elite Beach Ranking</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-[#8FA9AE]">
            Sair
          </button>
        </form>
      </header>

      <section className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-[#123239] p-6">
        <p className="text-sm text-[#8FA9AE]">
          Fundação pronta. As telas (Ranking, Sorteio, Cadastros, Configurações)
          serão construídas a seguir, começando pelo motor de sorteio.
        </p>
      </section>
    </main>
  );
}
