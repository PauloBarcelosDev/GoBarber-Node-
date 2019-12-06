import Appointment from '../models/Appointment'
import { Op } from 'sequelize';
import User from '../models/User';
import { endOfDay , startOfDay , parseISO } from 'date-fns';
class SchenduleController{
  async index(req, res){
    const checkUserProvider = await User.findOne({
      where: { id: req.userId, provider: true },
    });
    if (!checkUserProvider){
      return res.status(401).json({ error: 'user is not a provider' });
    }
    const { date } = req.query;
    const parsedDate = parseISO(date);

    const appointments = await Appointment.findAll({
      where: {
        provider_id: req.userId,
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(parsedDate), endOfDay(parsedDate)],
        },
      },
      order: ['date'],
    });
    return res.json(appointments);
  }
}
export default new SchenduleController();
