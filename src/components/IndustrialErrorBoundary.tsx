import React, { Component, type ErrorInfo, type PropsWithChildren } from 'react';

type State = { error: Error | null };

type Props = PropsWithChildren<{}>;

export default class IndustrialErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('IndustrialCenter runtime error', error, info);
  }

  render() {
    if (!this.state.error) return (this as any).props.children;
    return (
      <section className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-black">Le Centre industriel n’a pas pu être affiché</h2>
        <p className="mt-2 text-sm">L’application reste disponible. Fermez ce panneau, puis réessayez.</p>
        <pre className="mt-4 max-h-48 overflow-auto rounded bg-white p-3 text-xs">{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
        <button onClick={() => (this as any).setState({ error: null })} className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white">Réessayer</button>
      </section>
    );
  }
}
