import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

const QUALITY_OPTIONS = ['best', 'good', 'normal', 'bad', 'worst'] as const
type QualityPreset = (typeof QUALITY_OPTIONS)[number]

interface DownloadQualitySelectProps {
  id: string
  value: QualityPreset
  onValueChange: (value: QualityPreset) => void
  disabled?: boolean
}

export function DownloadQualitySelect({
  id,
  value,
  onValueChange,
  disabled
}: DownloadQualitySelectProps) {
  const { t } = useTranslation()
  return (
    <Select
      disabled={disabled}
      onValueChange={(nextValue) => {
        const option = QUALITY_OPTIONS.find((candidate) => candidate === nextValue)
        if (option) {
          onValueChange(option)
        }
      }}
      value={value}
    >
      <SelectTrigger aria-label={t('settings.oneClickQuality')} className="h-7 text-xs" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {QUALITY_OPTIONS.map((option) => (
          <SelectItem className="text-xs" key={option} value={option}>
            {t(`settings.oneClickQualityOptions.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
