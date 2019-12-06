import Mail from '../../lib/Mail';
import pt from 'date-fns/locale/pt';
import  { format , parseISO} from 'date-fns';

class CancellatioMail {
  get key(){
    return 'CancellatioMail';
  }
  async handle({ data }){
    const { appointment } = data;
    console.log('a fila executou!');
    await Mail.sendMail({
      to: `${appointment.provider.name}<${appointment.provider.email}>`,
      subject: 'Agendamento Cancelado',
      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(
          parseISO(appointment.date),
          " 'dia' dd 'de ' MMMM', ás' H:mm'h'",
          {locale: pt}
        ),
      },
    });
  }
}
export default new CancellatioMail();
