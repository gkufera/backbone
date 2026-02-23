'use client';

import type { ElementResponse } from '../lib/api';

interface ElementListProps {
  elements: ElementResponse[];
  onArchive: (elementId: string) => void;
}

export function ElementList({ elements, onArchive }: ElementListProps) {
  const characters = elements.filter((e) => e.type === 'CHARACTER');
  const locations = elements.filter((e) => e.type === 'LOCATION');
  const other = elements.filter((e) => e.type !== 'CHARACTER' && e.type !== 'LOCATION');

  return (
    <div className="space-y-6">
      {characters.length > 0 && (
        <ElementGroup title="Characters" elements={characters} onArchive={onArchive} />
      )}
      {locations.length > 0 && (
        <ElementGroup title="Locations" elements={locations} onArchive={onArchive} />
      )}
      {other.length > 0 && <ElementGroup title="Other" elements={other} onArchive={onArchive} />}
    </div>
  );
}

function ElementGroup({
  title,
  elements,
  onArchive,
}: {
  title: string;
  elements: ElementResponse[];
  onArchive: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <ul className="space-y-1">
        {elements.map((elem) => (
          <li key={elem.id} className="flex items-center justify-between rounded border p-2">
            <div>
              <span className="font-medium">{elem.name}</span>
              <span className="ml-2 text-xs text-zinc-400">p. {elem.pageNumbers.join(', ')}</span>
            </div>
            <button
              onClick={() => onArchive(elem.id)}
              className="text-xs text-red-500 hover:text-red-700"
              aria-label={`Archive ${elem.name}`}
            >
              Archive
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
