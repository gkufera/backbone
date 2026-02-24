'use client';

import Link from 'next/link';
import type { ElementWithCountResponse } from '../lib/api';

interface ElementListProps {
  elements: ElementWithCountResponse[];
  onArchive: (elementId: string) => void;
  productionId?: string;
  scriptId?: string;
  activeElementId?: string | null;
  onElementClick?: (elementId: string) => void;
}

export function ElementList({
  elements,
  onArchive,
  productionId,
  scriptId,
  activeElementId,
  onElementClick,
}: ElementListProps) {
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
          activeElementId={activeElementId}
          onElementClick={onElementClick}
        />
      )}
      {locations.length > 0 && (
        <ElementGroup
          title="Locations"
          elements={locations}
          onArchive={onArchive}
          productionId={productionId}
          scriptId={scriptId}
          activeElementId={activeElementId}
          onElementClick={onElementClick}
        />
      )}
      {other.length > 0 && (
        <ElementGroup
          title="Other"
          elements={other}
          onArchive={onArchive}
          productionId={productionId}
          scriptId={scriptId}
          activeElementId={activeElementId}
          onElementClick={onElementClick}
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
  activeElementId,
  onElementClick,
}: {
  title: string;
  elements: ElementWithCountResponse[];
  onArchive: (id: string) => void;
  productionId?: string;
  scriptId?: string;
  activeElementId?: string | null;
  onElementClick?: (elementId: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-lg">{title}</h3>
      <ul className="divide-y divide-black">
        {elements.map((elem) => {
          const isActive = activeElementId === elem.id;
          return (
            <li
              key={elem.id}
              data-element-id={elem.id}
              className={`flex items-center justify-between py-2 ${
                isActive ? 'bg-black text-white' : ''
              }`}
            >
              <div
                className={onElementClick ? 'cursor-pointer' : ''}
                onClick={() => onElementClick?.(elem.id)}
              >
                {productionId && scriptId ? (
                  <Link
                    href={`/productions/${productionId}/scripts/${scriptId}/elements/${elem.id}`}
                    className={`font-medium font-mono underline ${isActive ? 'text-white' : ''}`}
                  >
                    {elem.name}
                  </Link>
                ) : (
                  <span className="font-medium font-mono">{elem.name}</span>
                )}
                {elem.highlightPage != null && (
                  <span
                    className={`ml-2 text-xs font-mono ${isActive ? 'text-white' : 'text-black'}`}
                  >
                    p. {elem.highlightPage}
                  </span>
                )}
                {elem._count?.options != null && (
                  <span
                    className={`ml-2 text-xs font-mono ${isActive ? 'text-white' : 'text-black'}`}
                  >
                    {elem._count.options} {elem._count.options === 1 ? 'option' : 'options'}
                  </span>
                )}
              </div>
              <button
                onClick={() => onArchive(elem.id)}
                className={`btn-text text-xs ${
                  isActive
                    ? 'text-white hover:bg-white hover:text-black'
                    : 'text-black hover:bg-black hover:text-white'
                }`}
                aria-label={`Archive ${elem.name}`}
              >
                Archive
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
