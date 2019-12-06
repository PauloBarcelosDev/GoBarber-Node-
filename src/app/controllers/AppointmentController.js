import Appointment from '../models/Appointment';
import * as Yup from 'yup';
import User from '../models/User';
import { startOfHour,parseISO, isBefore, format, subHours} from 'date-fns';
import File from '../models/File';
import Notification from '../schemas/Notification';
import  pt  from 'date-fns/locale/pt';

import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';



class AppointmentController{
  async index(req, res){
    const { page = 1 } = req.query;
    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order:['date'],
      attributes: ['id','date', 'past', 'cancelable'],
      limit: 20,
      offset: (page -1) *20,
      include:[
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include:[
            {
              model: File,
              as: 'avatar',
              attributes: ['id','path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }
  async store (req,res){
      const schema = Yup.object().shape({
        Provider_id: Yup.number().required(),
        date: Yup.date().required(),
      });
      if(!(await schema.isValid(req.body))){
        return res.status(400).json({ error: ' falha no preenchimento dos dados'});
      }
      const { Provider_id, date} = req.body;
      /**
       * check if provider_id a provider
       */
      const checkisProvider = await User.findOne({
        where:{id:Provider_id, provider: true},
      });
      if (!checkisProvider){
        return res
        .status(401)
        .json ({error: 'Não e um colaborador'})
      }
      //chacando se a data esta no futuro
      const hourStart = startOfHour(parseISO(date));

      if (isBefore (hourStart, new Date())){
        return res.status(400).json({error: 'data informada não é permitida'});
      }
      //checando a viabilidade do agendamento
      const checkAvaliability = await Appointment.findOne({
        where:{
          Provider_id,
          canceled_at: null,
          date: hourStart,
        },

      });
      if ( checkAvaliability){
        return res
        .status(400)
        .json({error: 'Agendamento invalido'})
      }

      const appointment = await Appointment.create({
        user_id: req.userId,
        Provider_id,
        date,
      })
/**
 * Notificar prestador de serviço
 */
const user = await User.findByPk( req.userId);
const formattedDate = format(
  hourStart,
  " 'dia' dd 'de ' MMMM', ás' H:mm'h'",
  {locale: pt}
)
      await Notification.create({
        content: `Novo agendamento de ${user.name} para o ${formattedDate}`,
        user: Provider_id,
      });
      return res.json(appointment);
    }
  async delete(req,res){
    const appointment = await  Appointment.findByPk(req.params.id, {
      include: [
        {
        model: User,
        as: 'provider',
        attributes: ['name','email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        }
      ],
    });

    if( appointment.user_id ===! req.userId){
      return res.status(401).json({
        error: "Você não tem permissão para cancelar este agendamento!"
      });
    }
    const dateWithSub = subHours(appointment.date, 2);

    if ( isBefore(dateWithSub, new Date())){
      return res.status(401).json({
        error:'Somente é permitido o cancelamento com duas horas de antecedencia'
      });
    }
    appointment.canceled_at  = new Date();
    await appointment.save();
    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}
export default new AppointmentController();
