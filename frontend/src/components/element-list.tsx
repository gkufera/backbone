'use client';

import Link from 'next/link';
import type { ElementResponse } from '../lib/api';

interface ElementListProps {
  elements: ElementResponse[];
  onArchive: (elementId: string) => void;
  productionId?: string;
  scriptId?: string;
}

export function ElementList({ elements, onArchive, productionId, scriptId }: ElementListProps) {
  const characters = elements.filter((e) => e.type === 'CHARACTER');
  const locations = elements.filter((e) => e.type === 'LOCATION');
  const other = elements.filter((e) => e.type !== 'CHARACTER' && e.type !== 'LOCATION');

  return (
    <div className="space-y-6">
      {characters.length > 0 && (
        <ElementGroup
          title="Characters"
          elements={characters}
          onArchive={onArchive}
          productionId={productionId}
          scriptId={scriptId}
        />
      )}
      {locations.length > 0 && (
        <ElementGroup
          title="Locations"
          elements={locations}
          onArchive={onArchive}
          productionId={productionId}
          scriptId={scriptId}
        />
      )}
      {other.length > 0 && (
        <ElementGroup
          title="Other"
          elements={other}
          onArchive={onArchive}
          productionId={productionId}
          scriptId={scriptId}
        />
      )}
    </div>
  );
}

function ElementGroup({
  title,
  elements,
  onArchive,
  productionId,
  scriptId,
}: {
  title: string;
  elements: ElementResponse[];
  onArchive: (id: string) => void;
  productionId?: string;
  scriptId?: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <ul className="space-y-1">
        {elements.map((elem) => (
          <li key={elem.id} className="flex items-center justify-between rounded border p-2">
            <div>
              {productionId && scriptId ? (
                <Link
                  href={`/productions/${productionId}/scripts/${scriptId}/elements/${elem.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {elem.name}
                </Link>
              ) : (
                <span className="font-medium">{elem.name}</span>
              )}
              <span className="ml-2 text-xs text-zinc-400">p. {elem.pageNumbers.join(', ')}</span>
              {(elem as any)._count?.options != null && (
                <span className="ml-2 text-xs text-zinc-500">
                  {(elem as any)._count.options}{' '}
                  {(elem as any)._count.options === 1 ? 'option' : 'options'}
                </span>
              )}
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
