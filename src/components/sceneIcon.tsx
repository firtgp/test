import {CpuIcon, LeafIcon, SparkleIcon} from '@phosphor-icons/react';
import type {ScenePreset} from '../scenes/meta';

/** Значок типа мира: техника, магия, выживание. */
export function SceneIcon({scene, size = 22}: {scene: ScenePreset | undefined; size?: number}) {
  const Icon = scene === 'techno' ? CpuIcon : scene === 'magic' ? SparkleIcon : LeafIcon;
  return <Icon size={size} weight="fill" aria-hidden="true" />;
}
