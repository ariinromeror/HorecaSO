import { AlertasCaducidadPanel } from './AlertasCaducidadPanel'
import { LotesTabPanel } from './LotesTabPanel'

export default function LotesTable(props) {
  if (props.mainTab === 'lotes') {
    return <LotesTabPanel {...props} />
  }
  if (props.mainTab === 'alertas') {
    return <AlertasCaducidadPanel {...props} />
  }
  return null
}
